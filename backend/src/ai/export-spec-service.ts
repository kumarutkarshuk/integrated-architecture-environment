import type { AppConfig } from "../config.js";
import { prisma } from "../db.js";
import { getInferenceProvider } from "./inference-provider.js";
import { AI_INFERENCE_PROVIDER, DEFAULT_GROQ_MODEL } from "./inference-defaults.js";
import { EXPORT_SPEC_PROMPT_VERSION } from "./prompts/export-spec.js";
import { readProjectCanvasRecords, summarizeCanvasRecords } from "./canvas-summary.js";
import type { ExportSpecResult } from "./types.js";

const EMPTY_CANVAS_PROMPT = "The canvas has no shapes.";

let inferenceConfig: Pick<AppConfig, "groqApiKey" | "groqModel" | "isTest"> = {
  groqModel: DEFAULT_GROQ_MODEL,
  isTest: process.env.NODE_ENV === "test",
};

export function configureExportSpecService(
  config: Pick<AppConfig, "groqApiKey" | "groqModel" | "isTest">,
): void {
  inferenceConfig = config;
}

export function configureExportSpecServiceFromEnv(): void {
  configureExportSpecService({
    groqApiKey: process.env.GROQ_API_KEY,
    groqModel: process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL,
    isTest: process.env.NODE_ENV === "test",
  });
}

export async function createExportSpecJob(projectId: string, userId: string) {
  const prompt = await readExportSpecPrompt(projectId);

  return prisma.aiGeneration.create({
    data: {
      projectId,
      userId,
      type: "export_spec",
      status: "pending",
      prompt,
      model: inferenceConfig.groqModel,
      promptVersion: EXPORT_SPEC_PROMPT_VERSION,
      provider: AI_INFERENCE_PROVIDER,
    },
  });
}

export async function runExportSpecJob(aiGenerationId: string): Promise<void> {
  const job = await prisma.aiGeneration.findUnique({
    where: { id: aiGenerationId },
  });

  if (!job || job.type !== "export_spec") {
    throw new Error(`Export spec job not found: ${aiGenerationId}`);
  }

  if (job.status === "completed") {
    return;
  }

  const prompt = job.prompt?.trim() || EMPTY_CANVAS_PROMPT;

  await prisma.aiGeneration.update({
    where: { id: aiGenerationId },
    data: { status: "running" },
  });

  const result = await getInferenceProvider(inferenceConfig).exportSpec(prompt);
  await completeExportSpecJob(aiGenerationId, result);
}

export async function failExportSpecJob(aiGenerationId: string): Promise<void> {
  const job = await prisma.aiGeneration.findUnique({
    where: { id: aiGenerationId },
  });

  if (!job || job.type !== "export_spec" || job.status === "completed") {
    return;
  }

  await prisma.aiGeneration.update({
    where: { id: aiGenerationId },
    data: { status: "failed" },
  });
}

async function readExportSpecPrompt(projectId: string): Promise<string> {
  const records = await readProjectCanvasRecords(projectId);
  return summarizeCanvasRecords(records) || EMPTY_CANVAS_PROMPT;
}

export async function completeExportSpecJob(
  aiGenerationId: string,
  result: ExportSpecResult,
): Promise<void> {
  await prisma.aiGeneration.update({
    where: { id: aiGenerationId },
    data: {
      status: "completed",
      result: {
        markdown: result.markdown,
        gaps_summary: result.gaps_summary,
      },
      tokensUsed: result.tokensUsed ?? null,
      model: result.model ?? inferenceConfig.groqModel,
    },
  });
}
