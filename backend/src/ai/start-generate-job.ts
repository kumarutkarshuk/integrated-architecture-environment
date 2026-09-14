import { enqueueGenerateJob } from "./job-runner.js";
import {
  createGenerateJob,
  failGenerateJob,
  PROMPT_NOT_ALLOWED_MESSAGE,
} from "./generate-service.js";
import {
  assertPromptBlockedByCode,
  InappropriatePromptError,
  isInappropriatePrompt,
} from "./prompt-guard.js";
import { consumeAiQuota } from "./rate-limit.js";
import { prisma } from "../db.js";

export async function createAndEnqueueGenerateJob(
  projectId: string,
  userId: string,
  prompt: string,
) {
  const trimmedPrompt = prompt.trim();
  assertPromptBlockedByCode(trimmedPrompt);
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
  const trimmedPrompt = prompt.trim();
  if (isInappropriatePrompt(trimmedPrompt)) {
    const job = await createGenerateJob(projectId, userId, trimmedPrompt);
    await failGenerateJob(job.id, PROMPT_NOT_ALLOWED_MESSAGE, "code");
    throw new InappropriatePromptError();
  }
  await consumeAiQuota(userId, "generate");
  return createAndEnqueueGenerateJob(projectId, userId, prompt);
}
