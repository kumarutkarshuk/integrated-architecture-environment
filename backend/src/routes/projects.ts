import { Router } from "express";
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
import { softDeleteProject } from "../projects/soft-delete.js";

export const projectsRouter = Router();

const projectSelect = {
  id: true,
  name: true,
  mode: true,
  status: true,
  createdAt: true,
  ownerId: true,
} as const;

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

  if (mode === "prompt") {
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      res.status(400).json({ error: "Prompt is required for prompt mode" });
      return;
    }

    try {
      await consumeAiQuota(user.id, "generate");
    } catch (error) {
      if (error instanceof AiRateLimitError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      throw error;
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        mode: "prompt",
        status: "generating",
        ownerId: user.id,
        collaborators: {
          create: {
            userId: user.id,
            role: "owner",
          },
        },
      },
      select: projectSelect,
    });

    await createAndEnqueueGenerateJob(project.id, user.id, prompt);

    const refreshed = await prisma.project.findFirst({
      where: { id: project.id, ...notDeleted },
      select: projectSelect,
    });

    res.status(201).json(refreshed ?? project);
    return;
  }

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      mode: "blank",
      status: "ready",
      ownerId: user.id,
      collaborators: {
        create: {
          userId: user.id,
          role: "owner",
        },
      },
    },
    select: projectSelect,
  });

  res.status(201).json(project);
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
    res.status(result.status).json({ error: result.error });
    return;
  }

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
  res.status(204).send();
});
