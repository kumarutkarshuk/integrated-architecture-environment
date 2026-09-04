import type { User } from "@prisma/client";
import { prisma } from "../db.js";

export async function findAccessibleProject(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      collaborators: {
        some: { userId },
      },
    },
  });
}

export async function findOwnedProject(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: userId,
    },
  });
}

export async function requireOwner(
  projectId: string,
  user: User,
): Promise<{ ok: true } | { ok: false; status: 404 | 403 }> {
  const project = await findOwnedProject(projectId, user.id);

  if (!project) {
    const exists = await prisma.project.findUnique({ where: { id: projectId } });
    return { ok: false, status: exists ? 403 : 404 };
  }

  return { ok: true };
}
