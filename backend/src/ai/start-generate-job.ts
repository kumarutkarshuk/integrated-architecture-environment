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
import { lockLiveProject, prisma } from "../db.js";

export class GenerateInProgressError extends Error {
  readonly status = 409;

  constructor() {
    super("A generate job is already running for this Project");
    this.name = "GenerateInProgressError";
  }
}

export async function createAndEnqueueGenerateJob(
  projectId: string,
  userId: string,
  prompt: string,
) {
  const trimmedPrompt = prompt.trim();
  assertPromptBlockedByCode(trimmedPrompt);

  const job = await prisma.$transaction(async (tx) => {
    const locked = await lockLiveProject(tx, projectId);
    if (!locked) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const live = await tx.aiGeneration.findFirst({
      where: {
        projectId,
        type: "generate",
        status: { in: ["pending", "running"] },
      },
      select: { id: true },
    });

    if (live) {
      throw new GenerateInProgressError();
    }

    const created = await createGenerateJob(
      projectId,
      userId,
      trimmedPrompt,
      tx,
    );

    await tx.project.updateMany({
      where: { id: projectId, deletedAt: null },
      data: { status: "generating" },
    });

    return created;
  });

  try {
    await enqueueGenerateJob({
      aiGenerationId: job.id,
      projectId,
      prompt: trimmedPrompt,
    });
  } catch (error) {
    await failGenerateJob(job.id, error);
    throw error;
  }

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
