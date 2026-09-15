import type { AppConfig } from "../config.js";
import { prisma } from "../db.js";
import { InvalidInferenceJsonError } from "./diagram-plan.js";
import { getInferenceProvider } from "./inference-provider.js";
import { AI_INFERENCE_PROVIDER, DEFAULT_GROQ_MODEL, DEFAULT_PROMPT_GUARD_MODEL } from "./inference-defaults.js";
import { parseGroqApiKeys, runWithGroqKeySlot } from "./groq-keys.js";
import {
  assertPromptBlockedByCode,
  classifyPromptSafety,
  configurePromptGuard,
  InappropriatePromptError,
  PROMPT_NOT_ALLOWED_MESSAGE,
} from "./prompt-guard.js";
import { EXPORT_SPEC_PROMPT_VERSION } from "./prompts/export-spec.js";
import { readProjectCanvasRecords, summarizeCanvasRecords } from "./canvas-summary.js";
import type { ExportSpecResult, PromptBlockSource } from "./types.js";

const EMPTY_CANVAS_PROMPT = "The canvas has no shapes.";

export const EXPORT_SPEC_RETRY_ATTEMPTS = 2;
export const EXPORT_SPEC_FAILED_MESSAGE = "Export Spec failed. Please try again.";
export const EXPORT_SPEC_INCOMPLETE_MESSAGE = "Export Spec result was incomplete";

let inferenceConfig: Pick<
  AppConfig,
  "groqApiKeys" | "groqModel" | "groqPromptGuardModel" | "isTest"
> = {
  groqApiKeys: [],
  groqModel: DEFAULT_GROQ_MODEL,
  groqPromptGuardModel: DEFAULT_PROMPT_GUARD_MODEL,
  isTest: process.env.NODE_ENV === "test",
};

export function configureExportSpecService(
  config: Pick<AppConfig, "groqApiKeys" | "groqModel" | "groqPromptGuardModel" | "isTest">,
): void {
  inferenceConfig = config;
  configurePromptGuard({
    groqApiKeys: config.groqApiKeys,
    groqPromptGuardModel: config.groqPromptGuardModel,
    isTest: config.isTest,
  });
}

export function configureExportSpecServiceFromEnv(): void {
  configureExportSpecService({
    groqApiKeys: parseGroqApiKeys(),
    groqModel: process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL,
    groqPromptGuardModel:
      process.env.GROQ_PROMPT_GUARD_MODEL ?? DEFAULT_PROMPT_GUARD_MODEL,
    isTest: process.env.NODE_ENV === "test",
  });
}

export function shouldSkipExportSpecRetry(
  error: unknown,
  attemptNumber: number,
): boolean {
  return (
    error instanceof InvalidInferenceJsonError &&
    attemptNumber >= EXPORT_SPEC_RETRY_ATTEMPTS
  );
}

export async function readExportSpecPrompt(projectId: string): Promise<string> {
  const records = await readProjectCanvasRecords(projectId);
  return summarizeCanvasRecords(records) || EMPTY_CANVAS_PROMPT;
}

export async function createExportSpecJob(
  projectId: string,
  userId: string,
  prompt?: string,
) {
  const resolvedPrompt = prompt ?? (await readExportSpecPrompt(projectId));

  return prisma.aiGeneration.create({
    data: {
      projectId,
      userId,
      type: "export_spec",
      status: "pending",
      prompt: resolvedPrompt,
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
    data: { status: "running", error: null, blockedBy: null },
  });

  const run = async () => {
    try {
      assertPromptBlockedByCode(prompt);
      const safe = await classifyPromptSafety(prompt);
      if (!safe) {
        await failExportSpecJob(
          aiGenerationId,
          PROMPT_NOT_ALLOWED_MESSAGE,
          "classifier",
        );
        return;
      }

      const result = await getInferenceProvider(inferenceConfig).exportSpec(prompt);
      await completeExportSpecJob(aiGenerationId, result);
    } catch (error) {
      if (error instanceof InappropriatePromptError) {
        await failExportSpecJob(aiGenerationId, error.message, "code");
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

export async function failExportSpecJob(
  aiGenerationId: string,
  error?: unknown,
  blockedBy?: PromptBlockSource,
): Promise<void> {
  const job = await prisma.aiGeneration.findUnique({
    where: { id: aiGenerationId },
  });

  if (
    !job ||
    job.type !== "export_spec" ||
    job.status === "completed" ||
    job.status === "failed"
  ) {
    return;
  }

  await prisma.aiGeneration.update({
    where: { id: aiGenerationId },
    data: {
      status: "failed",
      error: summarizeExportSpecFailure(error),
      blockedBy: blockedBy ?? null,
    },
  });
}

export function summarizeExportSpecFailure(error?: unknown): string {
  const raw = extractErrorText(error).replace(/\s+/g, " ").trim();
  if (!raw) {
    return EXPORT_SPEC_FAILED_MESSAGE;
  }

  const lower = raw.toLowerCase();
  if (isJsonExportSpecFailure(lower)) {
    return "Failed to generate JSON";
  }
  if (isIncompleteExportSpecFailure(lower)) {
    return EXPORT_SPEC_INCOMPLETE_MESSAGE;
  }
  if (isInvalidApiKeyFailure(lower)) {
    return "Invalid API key";
  }

  const line = raw
    .split(/[\n\r]/)[0]
    ?.replace(/^(?:error:\s*)+/i, "")
    .trim();
  return (line || EXPORT_SPEC_FAILED_MESSAGE).slice(0, 200);
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

function isJsonExportSpecFailure(lower: string): boolean {
  return (
    lower.includes("not valid json") ||
    lower.includes("invalid json") ||
    lower.includes("unexpected token") ||
    lower.includes("failed to parse json")
  );
}

function isIncompleteExportSpecFailure(lower: string): boolean {
  return (
    lower.includes("must include markdown") ||
    lower.includes("must include gaps_summary") ||
    lower.includes("must be an object") ||
    lower.includes("did not include spec content")
  );
}

function isInvalidApiKeyFailure(lower: string): boolean {
  return (
    lower.includes("invalid api key") ||
    lower.includes("incorrect api key") ||
    lower.includes("invalid_api_key")
  );
}

export async function completeExportSpecJob(
  aiGenerationId: string,
  result: ExportSpecResult,
): Promise<void> {
  await prisma.aiGeneration.update({
    where: { id: aiGenerationId },
    data: {
      status: "completed",
      error: null,
      blockedBy: null,
      result: {
        markdown: result.markdown,
        gaps_summary: result.gaps_summary,
      },
      tokensUsed: result.tokensUsed ?? null,
      model: result.model ?? inferenceConfig.groqModel,
    },
  });
}
