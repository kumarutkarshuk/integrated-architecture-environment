import { buildRecordsFromDiagramPlan } from "./diagram-records.js";
import { buildFixtureExportSpecResult, buildFixtureGenerateResult } from "./fixture.js";
import {
  generateDiagramPlanWithGroq,
  generateExportSpecWithGroq,
  type GroqConfig,
} from "./groq-client.js";
import type { ExportSpecResult, GenerateResult } from "./types.js";

export interface InferenceProvider {
  generate(prompt: string): Promise<GenerateResult>;
  exportSpec(canvasSummary: string): Promise<ExportSpecResult>;
}

export function createFixtureInferenceProvider(): InferenceProvider {
  return {
    async generate(prompt) {
      return buildFixtureGenerateResult(prompt);
    },
    async exportSpec(canvasSummary) {
      return buildFixtureExportSpecResult(canvasSummary);
    },
  };
}

export function createGroqInferenceProvider(config: GroqConfig): InferenceProvider {
  return {
    async generate(prompt) {
      const { plan, tokensUsed, model } = await generateDiagramPlanWithGroq(prompt, config);
      return {
        ...buildRecordsFromDiagramPlan(plan),
        plan,
        tokensUsed,
        model,
      };
    },
    async exportSpec(canvasSummary) {
      return generateExportSpecWithGroq(canvasSummary, config);
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
