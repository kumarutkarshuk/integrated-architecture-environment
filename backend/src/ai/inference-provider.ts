import { buildRecordsFromDiagramPlan } from "./diagram-records.js";
import { buildFixtureGenerateResult } from "./fixture.js";
import {
  generateDiagramPlanWithGroq,
  type GroqConfig,
} from "./groq-client.js";
import type { GenerateResult } from "./types.js";

export interface InferenceProvider {
  generate(prompt: string): Promise<GenerateResult>;
}

export function createFixtureInferenceProvider(): InferenceProvider {
  return {
    async generate(prompt) {
      return buildFixtureGenerateResult(prompt);
    },
  };
}

export function createGroqInferenceProvider(config: GroqConfig): InferenceProvider {
  return {
    async generate(prompt) {
      const { plan, tokensUsed, model } = await generateDiagramPlanWithGroq(prompt, config);
      return {
        ...buildRecordsFromDiagramPlan(plan),
        tokensUsed,
        model,
      };
    },
  };
}

let activeInferenceProvider: InferenceProvider | null = null;

export function setInferenceProvider(provider: InferenceProvider): void {
  activeInferenceProvider = provider;
}

export function resetInferenceProvider(): void {
  activeInferenceProvider = null;
}

export function getInferenceProvider(config?: {
  groqApiKey?: string;
  groqModel: string;
  isTest: boolean;
}): InferenceProvider {
  if (activeInferenceProvider) {
    return activeInferenceProvider;
  }

  if (config && !config.isTest && config.groqApiKey) {
    return createGroqInferenceProvider({
      apiKey: config.groqApiKey,
      model: config.groqModel,
    });
  }

  return createFixtureInferenceProvider();
}
