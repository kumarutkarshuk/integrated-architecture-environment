import { enqueueExportSpecJob } from "./job-runner.js";
import {
  createExportSpecJob,
  failExportSpecJob,
  readExportSpecPrompt,
} from "./export-spec-service.js";
import {
  InappropriatePromptError,
  isInappropriatePrompt,
  PROMPT_NOT_ALLOWED_MESSAGE,
} from "./prompt-guard.js";
import { consumeAiQuota } from "./rate-limit.js";

export async function startExportSpecJob(projectId: string, userId: string) {
  const prompt = await readExportSpecPrompt(projectId);
  if (isInappropriatePrompt(prompt)) {
    const job = await createExportSpecJob(projectId, userId, prompt);
    await failExportSpecJob(job.id, PROMPT_NOT_ALLOWED_MESSAGE, "code");
    throw new InappropriatePromptError();
  }

  await consumeAiQuota(userId, "export_spec");

  const job = await createExportSpecJob(projectId, userId, prompt);

  try {
    await enqueueExportSpecJob({
      aiGenerationId: job.id,
      projectId,
    });
  } catch (error) {
    await failExportSpecJob(job.id, error);
    throw error;
  }

  return job;
}
