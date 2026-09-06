import { enqueueExportSpecJob } from "./job-runner.js";
import { createExportSpecJob } from "./export-spec-service.js";

export async function startExportSpecJob(projectId: string, userId: string) {
  const job = await createExportSpecJob(projectId, userId);

  await enqueueExportSpecJob({
    aiGenerationId: job.id,
    projectId,
  });

  return job;
}
