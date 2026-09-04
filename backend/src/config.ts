export interface AppConfig {
  port: number;
  corsOrigin: string;
  clerkSecretKey: string;
  groqApiKey?: string;
  groqModel: string;
  isTest: boolean;
}

export function loadConfig(): AppConfig {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;

  if (!process.env.CLERK_SECRET_KEY && process.env.NODE_ENV !== "test") {
    throw new Error("CLERK_SECRET_KEY is required");
  }

  return {
    port: Number(process.env.PORT ?? 4000),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    clerkSecretKey: clerkSecretKey ?? "test-secret",
    groqApiKey: process.env.GROQ_API_KEY,
    groqModel: process.env.GROQ_MODEL ?? "openai/gpt-oss-20b",
    isTest: process.env.NODE_ENV === "test",
  };
}
