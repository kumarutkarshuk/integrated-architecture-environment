import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const notDeleted = { deletedAt: null } as const;
