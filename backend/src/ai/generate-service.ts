import type { AppConfig } from "../config.js";
import { captureEvent } from "../analytics.js";
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

export function configureGenerateServiceFromEnv(): void {
  configureGenerateService({
    groqApiKey: process.env.GROQ_API_KEY,
    groqModel: process.env.GROQ_MODEL ?? "openai/gpt-oss-20b",
    isTest: process.env.NODE_ENV === "test",
  });
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
      model: inferenceConfig.groqModel,
    },
  });
}

export async function runGenerateJob(aiGenerationId: string): Promise<void> {
  const job = await prisma.aiGeneration.findUnique({
    where: { id: aiGenerationId },
  });

  if (!job || job.type !== "generate") {
    throw new Error(`Generate job not found: ${aiGenerationId}`);
  }

  if (job.status === "completed") {
    return;
  }

  await prisma.aiGeneration.update({
    where: { id: aiGenerationId },
    data: { status: "running" },
  });

  const result = await produceGenerateResult(job.prompt ?? "");
  await completeGenerateJob(aiGenerationId, result);
}

export async function failGenerateJob(aiGenerationId: string): Promise<void> {
  const job = await prisma.aiGeneration.findUnique({
    where: { id: aiGenerationId },
    include: { user: { select: { clerkId: true } } },
  });

  if (!job || job.type !== "generate" || job.status === "completed" || job.status === "failed") {
    return;
  }

  await prisma.aiGeneration.update({
    where: { id: aiGenerationId },
    data: { status: "failed" },
  });

  captureEvent(job.user.clerkId, "ai_generation_failed", {
    projectId: job.projectId,
    aiGenerationId: job.id,
  });

  const completedPreviewCount = await prisma.aiGeneration.count({
    where: {
      projectId: job.projectId,
      type: "generate",
      status: "completed",
      appliedAt: null,
    },
  });

  if (completedPreviewCount > 0) {
    await prisma.project.updateMany({
      where: { id: job.projectId, deletedAt: null },
      data: { status: "preview" },
    });
    return;
  }

  await prisma.project.updateMany({
    where: { id: job.projectId, deletedAt: null },
    data: { status: "failed" },
  });
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
      model: result.model ?? inferenceConfig.groqModel,
    },
  });

  await prisma.project.updateMany({
    where: { id: job.projectId, deletedAt: null },
    data: { status: "preview" },
  });
}
