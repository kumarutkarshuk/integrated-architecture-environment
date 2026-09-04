import type { GenerateJobPayload } from "./types.js";
import { runGenerateJob } from "./generate-service.js";

export interface JobRunner {
  enqueueGenerate(payload: GenerateJobPayload): Promise<void>;
}

export function createInProcessJobRunner(): JobRunner {
  return {
    async enqueueGenerate(payload) {
      // Return immediately so HTTP handlers are not blocked on Groq latency.
      void runGenerateJob(payload.aiGenerationId);
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

let activeJobRunner: JobRunner = createInProcessJobRunner();

export function setJobRunner(runner: JobRunner): void {
  activeJobRunner = runner;
}

export function getJobRunner(): JobRunner {
  return activeJobRunner;
}

export function resetJobRunner(): void {
  activeJobRunner = createInProcessJobRunner();
}

export async function enqueueGenerateJob(
  payload: GenerateJobPayload,
): Promise<void> {
  await getJobRunner().enqueueGenerate(payload);
}
