import { GENERATE_TASK_ID, type GenerateJobPayload } from "./types.js";
import type { generateTask } from "../trigger/generate.js";

export interface JobRunner {
  enqueueGenerate(payload: GenerateJobPayload): Promise<void>;
}

export function createTriggerDevJobRunner(): JobRunner {
  return {
    async enqueueGenerate(payload) {
      if (!process.env.TRIGGER_SECRET_KEY) {
        throw new Error("TRIGGER_SECRET_KEY is required to enqueue AI generation jobs");
      }

      const { tasks } = await import("@trigger.dev/sdk");
      await tasks.trigger<typeof generateTask>(
        GENERATE_TASK_ID,
        payload,
        { idempotencyKey: payload.aiGenerationId },
      );
    },
  };
}

export function createTestJobRunner(): {
  runner: JobRunner;
  getEnqueued: () => GenerateJobPayload[];
  reset: () => void;
} {
  const enqueued: GenerateJobPayload[] = [];

  return {
    runner: {
      async enqueueGenerate(payload) {
        enqueued.push(payload);
      },
    },
    getEnqueued: () => [...enqueued],
    reset: () => {
      enqueued.length = 0;
    },
  };
}

let activeJobRunner: JobRunner = createTriggerDevJobRunner();

export function setJobRunner(runner: JobRunner): void {
  activeJobRunner = runner;
}

export function getJobRunner(): JobRunner {
  return activeJobRunner;
}

export function resetJobRunner(): void {
  activeJobRunner = createTriggerDevJobRunner();
}

export async function enqueueGenerateJob(
  payload: GenerateJobPayload,
): Promise<void> {
  await getJobRunner().enqueueGenerate(payload);
}
