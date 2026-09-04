import { Router } from "express";
import type { AuthenticatedRequest } from "../auth/middleware.js";
import { prisma } from "../db.js";
import { findOwnedProject, requireOwner } from "../projects/access.js";

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

  const { name, mode } = req.body as { name?: string; mode?: string };

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  if (mode !== "blank") {
    res.status(400).json({ error: "Only blank mode is supported in this endpoint" });
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

  await prisma.project.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
