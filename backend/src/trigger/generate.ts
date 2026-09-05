import { task } from "@trigger.dev/sdk";
import {
  configureGenerateServiceFromEnv,
  failGenerateJob,
  runGenerateJob,
} from "../ai/generate-service.js";
import { GENERATE_TASK_ID, type GenerateJobPayload } from "../ai/types.js";

export const generateTask = task({
  id: GENERATE_TASK_ID,
  maxDuration: 300,
  run: async (payload: GenerateJobPayload) => {
    configureGenerateServiceFromEnv();
    await runGenerateJob(payload.aiGenerationId);
    return { aiGenerationId: payload.aiGenerationId };
  },
  onFailure: async ({ payload }) => {
    await failGenerateJob(payload.aiGenerationId);
  },
});
