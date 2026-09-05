import { parseDiagramPlan, type DiagramPlan } from "./diagram-plan.js";
import { GENERATE_DIAGRAM_SYSTEM_PROMPT } from "./prompts/generate-diagram.js";

const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;

export interface GroqConfig {
  apiKey: string;
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
  const timeoutMs = config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

  return await withTimeout(
    () => requestDiagramPlanWithGroq(prompt, config),
    timeoutMs,
    `Groq request timed out after ${timeoutMs}ms`,
  );
}

async function requestDiagramPlanWithGroq(
  prompt: string,
  config: GroqConfig,
): Promise<GroqInferenceResult> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: GENERATE_DIAGRAM_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 2048,
    }),
  });

  const body = (await response.json()) as GroqChatCompletionResponse;

  if (!response.ok) {
    throw new Error(body.error?.message ?? `Groq request failed: ${response.status}`);
  }

  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq response did not include diagram content");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Groq response was not valid JSON");
  }

  return {
    plan: parseDiagramPlan(parsed),
    tokensUsed: body.usage?.total_tokens,
    model: body.model ?? config.model,
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
