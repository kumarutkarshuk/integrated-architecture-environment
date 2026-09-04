import { prisma } from "../db.js";
import { runGenerateJob } from "./generate-service.js";

export async function recoverStaleGenerateJobs(): Promise<number> {
  const staleJobs = await prisma.aiGeneration.findMany({
    where: {
      type: "generate",
      status: { in: ["pending", "running"] },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const job of staleJobs) {
    await prisma.aiGeneration.update({
      where: { id: job.id },
      data: { status: "pending" },
    });
    void runGenerateJob(job.id);
  }

  return staleJobs.length;
}
