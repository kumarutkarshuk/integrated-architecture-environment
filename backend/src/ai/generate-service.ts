import type { Prisma } from "@prisma/client";
import type { AppConfig } from "../config.js";
import { captureEvent } from "../analytics.js";
import { prisma } from "../db.js";
import { InvalidDiagramPlanError, InvalidInferenceJsonError } from "./diagram-plan.js";
import { AI_INFERENCE_PROVIDER, DEFAULT_GROQ_MODEL, DEFAULT_PROMPT_GUARD_MODEL } from "./inference-defaults.js";
import { getInferenceProvider } from "./inference-provider.js";
import { parseGroqApiKeys, runWithGroqKeySlot } from "./groq-keys.js";
import {
  assertPromptBlockedByCode,
  classifyPromptSafety,
  configurePromptGuard,
  InappropriatePromptError,
  PROMPT_NOT_ALLOWED_MESSAGE,
} from "./prompt-guard.js";
import { GENERATE_DIAGRAM_PROMPT_VERSION } from "./prompts/generate-diagram.js";
import type { GenerateResult, PromptBlockSource } from "./types.js";

export { PROMPT_NOT_ALLOWED_MESSAGE, setPromptSafetyClassifier } from "./prompt-guard.js";

export const GENERATE_PLAN_RETRY_ATTEMPTS = 2;
export const GENERATE_FAILED_MESSAGE = "Generation failed. Please try again.";

export function shouldSkipGenerateRetry(error: unknown, attemptNumber: number): boolean {
  const isBadPlanOrJson =
    error instanceof InvalidDiagramPlanError || error instanceof InvalidInferenceJsonError;
  return isBadPlanOrJson && attemptNumber >= GENERATE_PLAN_RETRY_ATTEMPTS;
}

let inferenceConfig: Pick<
  AppConfig,
  "groqApiKeys" | "groqModel" | "groqPromptGuardModel" | "isTest"
> = {
  groqApiKeys: [],
  groqModel: DEFAULT_GROQ_MODEL,
  groqPromptGuardModel: DEFAULT_PROMPT_GUARD_MODEL,
  isTest: process.env.NODE_ENV === "test",
};

export function configureGenerateService(
  config: Pick<AppConfig, "groqApiKeys" | "groqModel" | "groqPromptGuardModel" | "isTest">,
): void {
  inferenceConfig = config;
  configurePromptGuard({
    groqApiKeys: config.groqApiKeys,
    groqPromptGuardModel: config.groqPromptGuardModel,
    isTest: config.isTest,
  });
}

export function configureGenerateServiceFromEnv(): void {
  configureGenerateService({
    groqApiKeys: parseGroqApiKeys(),
    groqModel: process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL,
    groqPromptGuardModel:
      process.env.GROQ_PROMPT_GUARD_MODEL ?? DEFAULT_PROMPT_GUARD_MODEL,
    isTest: process.env.NODE_ENV === "test",
  });
}

type GenerateDb = Pick<typeof prisma, "aiGeneration"> | Prisma.TransactionClient;

export async function createGenerateJob(
  projectId: string,
  userId: string,
  prompt: string,
  db: GenerateDb = prisma,
) {
  return db.aiGeneration.create({
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

  if (job.status !== "pending" && job.status !== "running") {
    return;
  }

  const started = await prisma.aiGeneration.updateMany({
    where: {
      id: aiGenerationId,
      type: "generate",
      status: { in: ["pending", "running"] },
    },
    data: { status: "running", error: null, blockedBy: null },
  });

  if (started.count === 0) {
    return;
  }

  const prompt = job.prompt ?? "";

  const run = async () => {
    try {
      assertPromptBlockedByCode(prompt);
      const safe = await classifyPromptSafety(prompt);
      if (!safe) {
        await failGenerateJob(
          aiGenerationId,
          PROMPT_NOT_ALLOWED_MESSAGE,
          "classifier",
        );
        return;
      }

      const result = await produceGenerateResult(prompt);
      if (!result.plan) {
        throw new InvalidDiagramPlanError("Generate result is missing a Plan");
      }
      await completeGenerateJob(aiGenerationId, result);
    } catch (error) {
      if (error instanceof InappropriatePromptError) {
        await failGenerateJob(aiGenerationId, error.message, "code");
        return;
      }
      throw error;
    }
  };

  if (inferenceConfig.groqApiKeys.length > 0) {
    await runWithGroqKeySlot(inferenceConfig.groqApiKeys, run);
    return;
  }

  await run();
}

export async function failGenerateJob(
  aiGenerationId: string,
  error?: unknown,
  blockedBy?: PromptBlockSource,
): Promise<void> {
  const job = await prisma.aiGeneration.findUnique({
    where: { id: aiGenerationId },
    include: { user: { select: { clerkId: true } } },
  });

  if (!job || job.type !== "generate") {
    return;
  }

  const failed = await prisma.$transaction(async (tx) => {
    const marked = await tx.aiGeneration.updateMany({
      where: {
        id: aiGenerationId,
        type: "generate",
        status: { in: ["pending", "running"] },
      },
      data: {
        status: "failed",
        error: jobErrorMessage(error),
        blockedBy: blockedBy ?? null,
      },
    });

    if (marked.count === 0) {
      return false;
    }

    const liveSiblingCount = await tx.aiGeneration.count({
      where: {
        projectId: job.projectId,
        type: "generate",
        status: { in: ["pending", "running"] },
        id: { not: aiGenerationId },
      },
    });

    if (liveSiblingCount > 0) {
      await tx.project.updateMany({
        where: { id: job.projectId, deletedAt: null },
        data: { status: "generating" },
      });
      return true;
    }

    const completedPreviewCount = await tx.aiGeneration.count({
      where: {
        projectId: job.projectId,
        type: "generate",
        status: "completed",
        appliedAt: null,
      },
    });

    await tx.project.updateMany({
      where: { id: job.projectId, deletedAt: null },
      data: { status: completedPreviewCount > 0 ? "preview" : "failed" },
    });

    return true;
  });

  if (!failed) {
    return;
  }

  captureEvent(job.user.clerkId, "ai_generation_failed", {
    projectId: job.projectId,
    aiGenerationId: job.id,
    ...(blockedBy ? { blockedBy } : {}),
  });
}

async function produceGenerateResult(prompt: string): Promise<GenerateResult> {
  return getInferenceProvider(inferenceConfig).generate(prompt);
}

export function summarizeGenerateFailure(error?: unknown): string {
  const raw = extractErrorText(error).replace(/\s+/g, " ").trim();
  if (!raw) {
    return GENERATE_FAILED_MESSAGE;
  }

  const lower = raw.toLowerCase();
  if (isJsonGenerateFailure(lower)) {
    return "Failed to generate JSON";
  }
  if (isInvalidApiKeyFailure(lower)) {
    return "Invalid API key";
  }

  const line = raw
    .split(/[\n\r]/)[0]
    ?.replace(/^(?:error:\s*)+/i, "")
    .trim();
  return (line || GENERATE_FAILED_MESSAGE).slice(0, 200);
}

function extractErrorText(error: unknown): string {
  if (error == null) {
    return "";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    const cause = extractErrorText(
      (error as Error & { cause?: unknown }).cause,
    );
    return [error.message, cause].filter(Boolean).join("\n");
  }
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }
  return "";
}

function isJsonGenerateFailure(lower: string): boolean {
  return (
    lower.includes("not valid json") ||
    lower.includes("invalid json") ||
    lower.includes("unexpected token") ||
    lower.includes("failed to parse json")
  );
}

function isInvalidApiKeyFailure(lower: string): boolean {
  return (
    lower.includes("invalid api key") ||
    lower.includes("incorrect api key") ||
    lower.includes("invalid_api_key")
  );
}

function jobErrorMessage(error?: unknown): string {
  return summarizeGenerateFailure(error);
}

export async function completeGenerateJob(
  aiGenerationId: string,
  result: GenerateResult,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const job = await tx.aiGeneration.findUnique({
      where: { id: aiGenerationId },
      select: { projectId: true, type: true },
    });

    if (!job || job.type !== "generate") {
      return;
    }

    const completed = await tx.aiGeneration.updateMany({
      where: {
        id: aiGenerationId,
        type: "generate",
        status: { in: ["pending", "running"] },
      },
      data: {
        status: "completed",
        error: null,
        blockedBy: null,
        result: { records: result.records } as object,
        plan: result.plan as object,
        tokensUsed: result.tokensUsed ?? null,
        model: result.model ?? inferenceConfig.groqModel,
      },
    });

    if (completed.count === 0) {
      return;
    }

    await tx.project.updateMany({
      where: { id: job.projectId, deletedAt: null },
      data: { status: "preview" },
    });
  });
}
