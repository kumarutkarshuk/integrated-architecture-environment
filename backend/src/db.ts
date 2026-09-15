import { Prisma, PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const notDeleted = { deletedAt: null } as const;

export async function lockLiveProject(
  tx: Prisma.TransactionClient,
  projectId: string,
): Promise<boolean> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM project
    WHERE id = ${projectId}::uuid AND deleted_at IS NULL
    FOR UPDATE
  `;
  return rows.length > 0;
}
