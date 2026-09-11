import { Router } from "express";
import { captureEvent } from "../analytics.js";
import type { AuthenticatedRequest } from "../auth/middleware.js";
import { applyPreviewToCanvas } from "../ai/apply-preview.js";
import { AiRateLimitError } from "../ai/rate-limit.js";
import { startExportSpecJob } from "../ai/start-export-spec-job.js";
import { startGenerateJob } from "../ai/start-generate-job.js";
import { notDeleted, prisma } from "../db.js";
import { findAccessibleProject, requireOwner } from "../projects/access.js";

function sendAiRateLimitError(
  res: { status: (code: number) => { json: (body: object) => void } },
  error: unknown,
): boolean {
  if (!(error instanceof AiRateLimitError)) {
    return false;
  }

  res.status(error.status).json({ error: error.message });
  return true;
}

export const aiRouter = Router({ mergeParams: true });

function readProjectId(
  req: { params: Record<string, string | undefined> },
  res: { status: (code: number) => { json: (body: object) => void } },
): string | null {
  const projectId = req.params.id?.trim();
  if (!projectId) {
    res.status(400).json({ error: "Project id is required" });
    return null;
  }
  return projectId;
}

const jobSelect = {
  id: true,
  type: true,
  prompt: true,
  status: true,
  result: true,
  model: true,
  appliedAt: true,
  createdAt: true,
} as const;

aiRouter.post("/generate", async (req, res) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const projectId = readProjectId(req, res);
  if (!projectId) {
    return;
  }

  const { prompt } = req.body as { prompt?: string };

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }

  const ownerCheck = await requireOwner(projectId, user);

  if (!ownerCheck.ok) {
    res.status(ownerCheck.status).json({ error: "Project not found" });
    return;
  }

  const project = await findAccessibleProject(projectId, user.id);

  if (!project || project.mode !== "prompt") {
    res.status(400).json({ error: "Regenerate is only supported for prompt-mode projects" });
    return;
  }

  try {
    await startGenerateJob(projectId, user.id, prompt);
  } catch (error) {
    if (sendAiRateLimitError(res, error)) {
      return;
    }
    throw error;
  }

  const latestJob = await prisma.aiGeneration.findFirst({
    where: { projectId, type: "generate" },
    orderBy: { createdAt: "desc" },
    select: jobSelect,
  });

  captureEvent(user.clerkId, "ai_generation_started", { projectId });

  res.status(201).json(latestJob);
});

aiRouter.get("/previews", async (req, res) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const projectId = readProjectId(req, res);
  if (!projectId) {
    return;
  }

  const project = await findAccessibleProject(projectId, user.id);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const previews = await prisma.aiGeneration.findMany({
    where: {
      projectId,
      type: "generate",
      status: "completed",
      appliedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: jobSelect,
  });

  res.json(previews);
});

aiRouter.post("/export-spec", async (req, res) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const projectId = readProjectId(req, res);
  if (!projectId) {
    return;
  }

  const project = await findAccessibleProject(projectId, user.id);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (project.status !== "ready") {
    res.status(400).json({ error: "Export Spec is only available on a ready Project" });
    return;
  }

  try {
    const job = await startExportSpecJob(projectId, user.id);

    const createdJob = await prisma.aiGeneration.findFirst({
      where: { id: job.id, projectId, type: "export_spec" },
      select: jobSelect,
    });

    captureEvent(user.clerkId, "spec_exported", { projectId });

    res.status(201).json(createdJob);
  } catch (error) {
    if (sendAiRateLimitError(res, error)) {
      return;
    }
    console.error("Failed to start Export Spec", error);
    res.status(500).json({ error: "Failed to start Export Spec" });
  }
});

aiRouter.post("/apply", async (req, res) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const projectId = readProjectId(req, res);
  if (!projectId) {
    return;
  }

  const { aiGenerationId } = req.body as { aiGenerationId?: string };

  if (!aiGenerationId || typeof aiGenerationId !== "string") {
    res.status(400).json({ error: "aiGenerationId is required" });
    return;
  }

  const ownerCheck = await requireOwner(projectId, user);

  if (!ownerCheck.ok) {
    res.status(ownerCheck.status).json({ error: "Project not found" });
    return;
  }

  const result = await applyPreviewToCanvas(projectId, aiGenerationId);

  if (!("ok" in result)) {
    res.status(result.status).json({
      error: result.code === "not_found" ? "Preview not found" : result.message,
    });
    return;
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, ...notDeleted },
    select: {
      id: true,
      name: true,
      mode: true,
      status: true,
      createdAt: true,
      ownerId: true,
    },
  });

  captureEvent(user.clerkId, "preview_applied", {
    projectId,
    aiGenerationId,
  });

  res.json(project);
});

aiRouter.get("/:jobId", async (req, res) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const projectId = readProjectId(req, res);
  if (!projectId) {
    return;
  }

  const project = await findAccessibleProject(projectId, user.id);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const job = await prisma.aiGeneration.findFirst({
    where: {
      id: req.params.jobId,
      projectId,
    },
    select: jobSelect,
  });

  if (!job) {
    res.status(404).json({ error: "AI Generation job not found" });
    return;
  }

  res.json(job);
});
