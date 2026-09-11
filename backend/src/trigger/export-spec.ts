import { task } from "@trigger.dev/sdk";
import { configureAnalyticsFromEnv } from "../analytics.js";
import {
  configureExportSpecServiceFromEnv,
  failExportSpecJob,
  runExportSpecJob,
} from "../ai/export-spec-service.js";
import { EXPORT_SPEC_TASK_ID, type ExportSpecJobPayload } from "../ai/types.js";

export const exportSpecTask = task({
  id: EXPORT_SPEC_TASK_ID,
  maxDuration: 300,
  run: async (payload: ExportSpecJobPayload) => {
    configureAnalyticsFromEnv();
    configureExportSpecServiceFromEnv();
    await runExportSpecJob(payload.aiGenerationId);
    return { aiGenerationId: payload.aiGenerationId };
  },
  onFailure: async ({ payload }) => {
    configureAnalyticsFromEnv();
    await failExportSpecJob(payload.aiGenerationId);
  },
});
