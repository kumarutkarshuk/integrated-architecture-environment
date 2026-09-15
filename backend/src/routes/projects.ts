import { Prisma } from "@prisma/client";
import { Router } from "express";
import { captureEvent } from "../analytics.js";
import { InappropriatePromptError, assertPromptAllowed } from "../ai/prompt-guard.js";
import { AiRateLimitError, consumeAiQuota } from "../ai/rate-limit.js";
import { createAndEnqueueGenerateJob } from "../ai/start-generate-job.js";
import { clearCanvasPersistenceTimer } from "../canvas/persistence.js";
import { teardownCanvasDoc } from "../canvas/yjs-ws-utils.js";
import type { AuthenticatedRequest } from "../auth/middleware.js";
import { notDeleted, prisma } from "../db.js";
import {
  createProjectInvite,
  listProjectCollaborators,
  resendProjectInvite,
} from "../invites/service.js";
import { requireOwner } from "../projects/access.js";
import {
  consumeProjectCreateQuota,
  peekProjectCreateQuota,
  ProjectCreateRateLimitError,
} from "../projects/create-quota.js";
import { softDeleteProject } from "../projects/soft-delete.js";

const PROJECT_NAME_CLASH_ERROR = "A Project with this name already exists";

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

const projectSelect = {
  id: true,
  name: true,
  mode: true,
  status: true,
  createdAt: true,
  ownerId: true,
} as const;

async function liveProjectNameTaken(
  ownerId: string,
  name: string,
): Promise<boolean> {
  const existing = await prisma.project.findFirst({
    where: {
      ownerId,
      ...notDeleted,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });

  return existing !== null;
}

async function createOwnedProject(data: {
  name: string;
  mode: "blank" | "prompt";
  status: "ready" | "generating";
  ownerId: string;
}) {
  try {
    const project = await prisma.project.create({
      data: {
        name: data.name,
        mode: data.mode,
        status: data.status,
        ownerId: data.ownerId,
        collaborators: {
          create: {
            userId: data.ownerId,
            role: "owner",
          },
        },
      },
      select: projectSelect,
    });
    return { ok: true as const, project };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false as const };
    }
    throw error;
  }
}

export const projectsRouter = Router();

projectsRouter.get("/", async (req, res) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const projects = await prisma.project.findMany({
    where: {
      ...notDeleted,
      collaborators: {
        some: { userId: user.id, ...notDeleted },
      },
    },
    orderBy: { createdAt: "desc" },
    select: projectSelect,
  });

  res.json(projects);
});

projectsRouter.post("/", async (req, res) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { name, mode, prompt } = req.body as {
    name?: string;
    mode?: string;
    prompt?: string;
  };

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  if (mode !== "blank" && mode !== "prompt") {
    res.status(400).json({ error: "Mode must be blank or prompt" });
    return;
  }

  const trimmedName = name.trim();
  const trimmedPrompt =
    typeof prompt === "string" ? prompt.trim() : "";

  if (mode === "prompt" && !trimmedPrompt) {
    res.status(400).json({ error: "Prompt is required for prompt mode" });
    return;
  }

  if (await liveProjectNameTaken(user.id, trimmedName)) {
    res.status(409).json({ error: PROJECT_NAME_CLASH_ERROR });
    return;
  }

  if (mode === "prompt") {
    try {
      await assertPromptAllowed(trimmedPrompt);
    } catch (error) {
      if (error instanceof InappropriatePromptError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      throw error;
    }
  }

  try {
    await peekProjectCreateQuota(user.id);
    if (mode === "prompt") {
      await consumeAiQuota(user.id, "generate");
    }
    await consumeProjectCreateQuota(user.id);
  } catch (error) {
    if (
      error instanceof ProjectCreateRateLimitError ||
      error instanceof AiRateLimitError
    ) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }

  if (mode === "prompt") {
    const created = await createOwnedProject({
      name: trimmedName,
      mode: "prompt",
      status: "generating",
      ownerId: user.id,
    });
    if (!created.ok) {
      res.status(409).json({ error: PROJECT_NAME_CLASH_ERROR });
      return;
    }
    const project = created.project;

    await createAndEnqueueGenerateJob(project.id, user.id, trimmedPrompt);

    const refreshed = await prisma.project.findFirst({
      where: { id: project.id, ...notDeleted },
      select: projectSelect,
    });

    captureEvent(user.clerkId, "project_created", {
      mode: "prompt",
      projectId: project.id,
    });
    captureEvent(user.clerkId, "ai_generation_started", {
      projectId: project.id,
    });

    res.status(201).json(refreshed ?? project);
    return;
  }

  const created = await createOwnedProject({
    name: trimmedName,
    mode: "blank",
    status: "ready",
    ownerId: user.id,
  });
  if (!created.ok) {
    res.status(409).json({ error: PROJECT_NAME_CLASH_ERROR });
    return;
  }

  captureEvent(user.clerkId, "project_created", {
    mode: "blank",
    projectId: created.project.id,
  });

  res.status(201).json(created.project);
});

projectsRouter.get("/:id/collaborators", async (req, res) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const result = await listProjectCollaborators(req.params.id, user);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json(result.value);
});

projectsRouter.post("/:id/invites", async (req, res) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const result = await createProjectInvite(
    req.params.id,
    user,
    (req.body as { email?: unknown }).email,
  );

  if (!result.ok) {
    if (
      result.status === 409 &&
      result.error.startsWith("Collaborator limit reached")
    ) {
      captureEvent(user.clerkId, "collaborator_limit_reached", {
        projectId: req.params.id,
      });
    }
    res.status(result.status).json({ error: result.error });
    return;
  }

  captureEvent(user.clerkId, "invite_sent", { projectId: req.params.id });

  res.status(201).json(result.value);
});

projectsRouter.post("/:id/invites/:inviteId/resend", async (req, res) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const result = await resendProjectInvite(
    req.params.id,
    req.params.inviteId,
    user,
  );

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  captureEvent(user.clerkId, "invite_resent", { projectId: req.params.id });

  res.json(result.value);
});

projectsRouter.get("/:id", async (req, res) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const project = await prisma.project.findFirst({
    where: {
      id: req.params.id,
      ...notDeleted,
      collaborators: {
        some: { userId: user.id, ...notDeleted },
      },
    },
    select: projectSelect,
  });

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(project);
});

projectsRouter.delete("/:id", async (req, res) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const access = await requireOwner(req.params.id, user);

  if (!access.ok) {
    res.status(access.status).json({ error: "Project not found" });
    return;
  }

  const projectId = req.params.id;

  clearCanvasPersistenceTimer(projectId);
  teardownCanvasDoc(projectId);

  await softDeleteProject(projectId);
  captureEvent(user.clerkId, "project_deleted", { projectId });
  res.status(204).send();
});
