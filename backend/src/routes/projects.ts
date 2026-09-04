import { Router } from "express";
import { startGenerateJob } from "../ai/start-generate-job.js";
import { clearCanvasPersistenceTimer } from "../canvas/persistence.js";
import { teardownCanvasDoc } from "../canvas/yjs-ws-utils.js";
import type { AuthenticatedRequest } from "../auth/middleware.js";
import { prisma } from "../db.js";
import { requireOwner } from "../projects/access.js";

export const projectsRouter = Router();

const projectSelect = {
  id: true,
  name: true,
  mode: true,
  status: true,
  createdAt: true,
} as const;

projectsRouter.get("/", async (req, res) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const projects = await prisma.project.findMany({
    where: {
      collaborators: {
        some: { userId: user.id },
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

    await startGenerateJob(project.id, user.id, prompt);

    const refreshed = await prisma.project.findUnique({
      where: { id: project.id },
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

projectsRouter.get("/:id", async (req, res) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const project = await prisma.project.findFirst({
    where: {
      id: req.params.id,
      collaborators: {
        some: { userId: user.id },
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

  await prisma.project.delete({ where: { id: projectId } });
  res.status(204).send();
});
