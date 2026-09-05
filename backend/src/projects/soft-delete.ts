import { prisma } from "../db.js";

export async function softDeleteProject(projectId: string): Promise<void> {
  const now = new Date();

  await prisma.$transaction([
    prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: now },
    }),
    prisma.collaborator.updateMany({
      where: { projectId, deletedAt: null },
      data: { deletedAt: now },
    }),
    prisma.projectInvite.updateMany({
      where: { projectId, deletedAt: null },
      data: { deletedAt: now },
    }),
    prisma.canvasSnapshot.updateMany({
      where: { projectId, deletedAt: null },
      data: { deletedAt: now },
    }),
  ]);
}
