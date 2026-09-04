import { Router } from "express";
import type { AuthenticatedRequest } from "../auth/middleware.js";
import { prisma } from "../db.js";

export const projectsRouter = Router();

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
    select: {
      id: true,
      name: true,
      mode: true,
      status: true,
      createdAt: true,
    },
  });

  res.json(projects);
});
