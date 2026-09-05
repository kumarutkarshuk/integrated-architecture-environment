import { enqueueGenerateJob } from "./job-runner.js";
import { createGenerateJob } from "./generate-service.js";
import { prisma } from "../db.js";

export async function startGenerateJob(
  projectId: string,
  userId: string,
  prompt: string,
) {
  const trimmedPrompt = prompt.trim();
  const job = await createGenerateJob(projectId, userId, trimmedPrompt);

  await prisma.project.updateMany({
    where: { id: projectId, deletedAt: null },
    data: { status: "generating" },
  });

  await enqueueGenerateJob({
    aiGenerationId: job.id,
    projectId,
    prompt: trimmedPrompt,
  });

  return job;
}
