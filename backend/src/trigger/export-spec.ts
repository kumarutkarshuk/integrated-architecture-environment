import { task } from "@trigger.dev/sdk";
import { configureAnalyticsFromEnv } from "../analytics.js";
import {
  configureExportSpecServiceFromEnv,
  failExportSpecJob,
  runExportSpecJob,
  shouldSkipExportSpecRetry,
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
  catchError: async ({ error, ctx }) => {
    if (shouldSkipExportSpecRetry(error, ctx.attempt.number)) {
      return { skipRetrying: true };
    }
  },
  onFailure: async ({ payload, error }) => {
    configureAnalyticsFromEnv();
    await failExportSpecJob(payload.aiGenerationId, error);
  },
});
