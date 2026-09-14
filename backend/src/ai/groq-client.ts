import { parseDiagramPlan, InvalidInferenceJsonError, type DiagramPlan } from "./diagram-plan.js";
import { takeGroqApiKey } from "./groq-keys.js";
import { GENERATE_DIAGRAM_SYSTEM_PROMPT } from "./prompts/generate-diagram.js";
import { EXPORT_SPEC_SYSTEM_PROMPT } from "./prompts/export-spec.js";
import type { ExportSpecResult } from "./types.js";

const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;

export interface GroqConfig {
  apiKey?: string;
  apiKeys?: string[];
  model: string;
  requestTimeoutMs?: number;
}

export interface GroqInferenceResult {
  plan: DiagramPlan;
  tokensUsed?: number;
  model: string;
}

interface GroqChatCompletionResponse {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: {
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  error?: {
    message?: string;
  };
}

export async function generateDiagramPlanWithGroq(
  prompt: string,
  config: GroqConfig,
): Promise<GroqInferenceResult> {
  const { parsed, tokensUsed, model } = await requestGroqJson(
    GENERATE_DIAGRAM_SYSTEM_PROMPT,
    prompt,
    config,
    "diagram content",
  );

  return {
    plan: parseDiagramPlan(parsed),
    tokensUsed,
    model,
  };
}

export async function generateExportSpecWithGroq(
  canvasSummary: string,
  config: GroqConfig,
): Promise<ExportSpecResult> {
  const { parsed, tokensUsed, model } = await requestGroqJson(
    EXPORT_SPEC_SYSTEM_PROMPT,
    canvasSummary || "The canvas has no shapes.",
    config,
    "spec content",
    4096,
  );

  return {
    ...parseExportSpecResult(parsed),
    tokensUsed,
    model,
  };
}

async function requestGroqJson(
  systemPrompt: string,
  userPrompt: string,
  config: GroqConfig,
  missingContentLabel: string,
  maxTokens = 2048,
): Promise<{ parsed: unknown; tokensUsed?: number; model: string }> {
  const timeoutMs = config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

  return await withTimeout(
    () =>
      requestGroqJsonOnce(
        systemPrompt,
        userPrompt,
        config,
        missingContentLabel,
        maxTokens,
      ),
    timeoutMs,
    `Groq request timed out after ${timeoutMs}ms`,
  );
}

async function requestGroqJsonOnce(
  systemPrompt: string,
  userPrompt: string,
  config: GroqConfig,
  missingContentLabel: string,
  maxTokens: number,
): Promise<{ parsed: unknown; tokensUsed?: number; model: string }> {
  const keys = groqKeysFromConfig(config);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < keys.length; attempt += 1) {
    const apiKey = takeGroqApiKey(keys);
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: maxTokens,
      }),
    });

    const body = (await response.json()) as GroqChatCompletionResponse;

    if (response.status === 429 && attempt < keys.length - 1) {
      lastError = new Error(body.error?.message ?? "Groq request failed: 429");
      continue;
    }

    if (!response.ok) {
      throw new Error(body.error?.message ?? `Groq request failed: ${response.status}`);
    }

    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`Groq response did not include ${missingContentLabel}`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new InvalidInferenceJsonError("Groq response was not valid JSON");
    }

    return {
      parsed,
      tokensUsed: body.usage?.total_tokens,
      model: body.model ?? config.model,
    };
  }

  throw lastError ?? new Error("Groq request failed");
}

function groqKeysFromConfig(config: GroqConfig): string[] {
  const keys = [
    ...(config.apiKeys ?? []),
    ...(config.apiKey ? [config.apiKey] : []),
  ].filter((key, index, all) => all.indexOf(key) === index);

  if (keys.length === 0) {
    throw new Error("No Groq API key configured");
  }

  return keys;
}

function parseExportSpecResult(raw: unknown): { markdown: string; gaps_summary: string } {
  if (!raw || typeof raw !== "object") {
    throw new Error("Export spec result must be an object");
  }

  const value = raw as Record<string, unknown>;
  const markdown = value.markdown;
  const gapsSummary = value.gaps_summary;

  if (typeof markdown !== "string" || !markdown.trim()) {
    throw new Error("Export spec result must include markdown");
  }

  if (typeof gapsSummary !== "string" || !gapsSummary.trim()) {
    throw new Error("Export spec result must include gaps_summary");
  }

  return {
    markdown: markdown.trim(),
    gaps_summary: gapsSummary.trim(),
  };
}

async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
