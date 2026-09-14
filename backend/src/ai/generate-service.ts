import type { AppConfig } from "../config.js";
import { captureEvent } from "../analytics.js";
import { prisma } from "../db.js";
import { InvalidDiagramPlanError, InvalidInferenceJsonError } from "./diagram-plan.js";
import { AI_INFERENCE_PROVIDER, DEFAULT_GROQ_MODEL } from "./inference-defaults.js";
import { getInferenceProvider } from "./inference-provider.js";
import { parseGroqApiKeys } from "./groq-keys.js";
import { assertPromptAllowed } from "./prompt-guard.js";
import { GENERATE_DIAGRAM_PROMPT_VERSION } from "./prompts/generate-diagram.js";
import type { GenerateResult } from "./types.js";

export const GENERATE_PLAN_RETRY_ATTEMPTS = 2;

export function shouldSkipGenerateRetry(error: unknown, attemptNumber: number): boolean {
  const isBadPlanOrJson =
    error instanceof InvalidDiagramPlanError || error instanceof InvalidInferenceJsonError;
  return isBadPlanOrJson && attemptNumber >= GENERATE_PLAN_RETRY_ATTEMPTS;
}

let inferenceConfig: Pick<AppConfig, "groqApiKeys" | "groqModel" | "isTest"> = {
  groqApiKeys: [],
  groqModel: DEFAULT_GROQ_MODEL,
  isTest: process.env.NODE_ENV === "test",
};

export function configureGenerateService(
  config: Pick<AppConfig, "groqApiKeys" | "groqModel" | "isTest">,
): void {
  inferenceConfig = config;
}

export function configureGenerateServiceFromEnv(): void {
  configureGenerateService({
    groqApiKeys: parseGroqApiKeys(),
    groqModel: process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL,
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
      promptVersion: GENERATE_DIAGRAM_PROMPT_VERSION,
      provider: AI_INFERENCE_PROVIDER,
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

  assertPromptAllowed(job.prompt ?? "");

  await prisma.aiGeneration.update({
    where: { id: aiGenerationId },
    data: { status: "running" },
  });

  const result = await produceGenerateResult(job.prompt ?? "");
  if (!result.plan) {
    throw new InvalidDiagramPlanError("Generate result is missing a Plan");
  }
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
      plan: result.plan as object,
      tokensUsed: result.tokensUsed ?? null,
      model: result.model ?? inferenceConfig.groqModel,
    },
  });

  await prisma.project.updateMany({
    where: { id: job.projectId, deletedAt: null },
    data: { status: "preview" },
  });
}
