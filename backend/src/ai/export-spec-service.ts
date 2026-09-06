import type { AppConfig } from "../config.js";
import { prisma } from "../db.js";
import { getInferenceProvider } from "./inference-provider.js";
import { readProjectCanvasRecords, summarizeCanvasRecords } from "./canvas-summary.js";
import type { ExportSpecResult } from "./types.js";

let inferenceConfig: Pick<AppConfig, "groqApiKey" | "groqModel" | "isTest"> = {
  groqModel: "openai/gpt-oss-20b",
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
    groqModel: process.env.GROQ_MODEL ?? "openai/gpt-oss-20b",
    isTest: process.env.NODE_ENV === "test",
  });
}

export async function createExportSpecJob(projectId: string, userId: string) {
  return prisma.aiGeneration.create({
    data: {
      projectId,
      userId,
      type: "export_spec",
      status: "pending",
      model: inferenceConfig.groqModel,
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

  await prisma.aiGeneration.update({
    where: { id: aiGenerationId },
    data: { status: "running" },
  });

  const result = await produceExportSpecResult(job.projectId);
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

async function produceExportSpecResult(projectId: string): Promise<ExportSpecResult> {
  const records = await readProjectCanvasRecords(projectId);
  const canvasSummary = summarizeCanvasRecords(records);
  return getInferenceProvider(inferenceConfig).exportSpec(canvasSummary);
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
