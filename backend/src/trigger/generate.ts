import { task } from "@trigger.dev/sdk";
import { configureAnalyticsFromEnv } from "../analytics.js";
import {
  configureGenerateServiceFromEnv,
  failGenerateJob,
  runGenerateJob,
  shouldSkipGenerateRetry,
} from "../ai/generate-service.js";
import { GENERATE_TASK_ID, type GenerateJobPayload } from "../ai/types.js";

export const generateTask = task({
  id: GENERATE_TASK_ID,
  maxDuration: 300,
  run: async (payload: GenerateJobPayload) => {
    configureAnalyticsFromEnv();
    configureGenerateServiceFromEnv();
    await runGenerateJob(payload.aiGenerationId);
    return { aiGenerationId: payload.aiGenerationId };
  },
  catchError: async ({ error, ctx }) => {
    if (shouldSkipGenerateRetry(error, ctx.attempt.number)) {
      return { skipRetrying: true };
    }
  },
  onFailure: async ({ payload }) => {
    configureAnalyticsFromEnv();
    await failGenerateJob(payload.aiGenerationId);
  },
});
