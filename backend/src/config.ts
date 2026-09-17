import { DEFAULT_GROQ_MODEL, DEFAULT_PROMPT_GUARD_MODEL } from "./ai/inference-defaults.js";
import { parseGroqApiKeys } from "./ai/groq-keys.js";

export interface AppConfig {
  host: string;
  port: number;
  corsOrigin: string;
  clerkSecretKey: string;
  groqApiKeys: string[];
  groqModel: string;
  groqPromptGuardModel: string;
  isTest: boolean;
}

export function loadConfig(): AppConfig {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;

  if (!process.env.CLERK_SECRET_KEY && process.env.NODE_ENV !== "test") {
    throw new Error("CLERK_SECRET_KEY is required");
  }

  if (
    (!process.env.BREVO_SMTP_LOGIN?.trim() ||
      !process.env.BREVO_SMTP_KEY ||
      !process.env.BREVO_FROM?.trim()) &&
    process.env.NODE_ENV !== "test"
  ) {
    throw new Error(
      "BREVO_SMTP_LOGIN, BREVO_SMTP_KEY, and BREVO_FROM are required",
    );
  }

  const isProduction = process.env.NODE_ENV === "production";

  return {
    host: process.env.HOST ?? (isProduction ? "0.0.0.0" : "127.0.0.1"),
    port: Number(process.env.PORT ?? 4000),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    clerkSecretKey: clerkSecretKey ?? "test-secret",
    groqApiKeys: parseGroqApiKeys(),
    groqModel: process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL,
    groqPromptGuardModel:
      process.env.GROQ_PROMPT_GUARD_MODEL ?? DEFAULT_PROMPT_GUARD_MODEL,
    isTest: process.env.NODE_ENV === "test",
  };
}
