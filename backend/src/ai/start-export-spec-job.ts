import { enqueueExportSpecJob } from "./job-runner.js";
import { createExportSpecJob } from "./export-spec-service.js";
import { consumeAiQuota } from "./rate-limit.js";

export async function startExportSpecJob(projectId: string, userId: string) {
  await consumeAiQuota(userId, "export_spec");

  const job = await createExportSpecJob(projectId, userId);

  await enqueueExportSpecJob({
    aiGenerationId: job.id,
    projectId,
  });

  return job;
}
