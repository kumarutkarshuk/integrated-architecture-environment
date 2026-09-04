import type { AppConfig } from "../config.js";
import { prisma } from "../db.js";
import { getInferenceProvider } from "./inference-provider.js";
import type { GenerateResult } from "./types.js";

let inferenceConfig: Pick<AppConfig, "groqApiKey" | "groqModel" | "isTest"> = {
  groqModel: "openai/gpt-oss-20b",
  isTest: process.env.NODE_ENV === "test",
};

export function configureGenerateService(
  config: Pick<AppConfig, "groqApiKey" | "groqModel" | "isTest">,
): void {
  inferenceConfig = config;
}

export async function createGenerateJob(
  projectId: string,
  userId: string,
  prompt: string,
) {
  return prisma.aiGeneration.create({
    data: {
      projectId,
      userId,
      type: "generate",
      status: "pending",
      prompt: prompt.trim(),
    },
  });
}

export async function runGenerateJob(aiGenerationId: string): Promise<void> {
  const job = await prisma.aiGeneration.findUnique({
    where: { id: aiGenerationId },
    include: { project: true },
  });

  if (!job || job.type !== "generate" || job.status !== "pending") {
    return;
  }

  await prisma.aiGeneration.update({
    where: { id: aiGenerationId },
    data: { status: "running" },
  });

  try {
    const result = await produceGenerateResult(job.prompt ?? "");
    await completeGenerateJob(aiGenerationId, result);
  } catch (error) {
    console.error("Generate job failed", aiGenerationId, error);
    await failGenerateJob(aiGenerationId, job.projectId);
  }
}

async function failGenerateJob(
  aiGenerationId: string,
  projectId: string,
): Promise<void> {
  await prisma.aiGeneration.update({
    where: { id: aiGenerationId },
    data: { status: "failed" },
  });

  const completedPreviewCount = await prisma.aiGeneration.count({
    where: {
      projectId,
      type: "generate",
      status: "completed",
      appliedAt: null,
    },
  });

  if (completedPreviewCount > 0) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "preview" },
    });
  }
}

async function produceGenerateResult(prompt: string): Promise<GenerateResult> {
  return getInferenceProvider(inferenceConfig).generate(prompt);
}

export async function completeGenerateJob(
  aiGenerationId: string,
  result: GenerateResult,
): Promise<void> {
  const job = await prisma.aiGeneration.update({
    where: { id: aiGenerationId },
    data: {
      status: "completed",
      result: { records: result.records } as object,
      tokensUsed: result.tokensUsed ?? null,
    },
    include: { project: true },
  });

  await prisma.project.update({
    where: { id: job.projectId },
    data: { status: "preview" },
  });
}
