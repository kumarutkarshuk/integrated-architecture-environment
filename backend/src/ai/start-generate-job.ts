import { enqueueGenerateJob } from "./job-runner.js";
import { createGenerateJob } from "./generate-service.js";
import { consumeAiQuota } from "./rate-limit.js";
import { prisma } from "../db.js";

export async function createAndEnqueueGenerateJob(
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

export async function startGenerateJob(
  projectId: string,
  userId: string,
  prompt: string,
) {
  await consumeAiQuota(userId, "generate");
  return createAndEnqueueGenerateJob(projectId, userId, prompt);
}
