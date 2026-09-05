import { Router } from "express";
import type { AuthenticatedRequest } from "../auth/middleware.js";
import { applyPreviewToCanvas } from "../ai/apply-preview.js";
import { startGenerateJob } from "../ai/start-generate-job.js";
import { notDeleted, prisma } from "../db.js";
import { findAccessibleProject, requireOwner } from "../projects/access.js";

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

const previewSelect = {
  id: true,
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

  await startGenerateJob(projectId, user.id, prompt);

  const latestJob = await prisma.aiGeneration.findFirst({
    where: { projectId, type: "generate" },
    orderBy: { createdAt: "desc" },
    select: previewSelect,
  });

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
    select: previewSelect,
  });

  res.json(previews);
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
    select: { id: true, name: true, mode: true, status: true, createdAt: true },
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
    select: previewSelect,
  });

  if (!job) {
    res.status(404).json({ error: "AI Generation job not found" });
    return;
  }

  res.json(job);
});
