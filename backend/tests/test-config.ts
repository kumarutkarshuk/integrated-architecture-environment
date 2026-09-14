import type { AppConfig } from "../src/config.js";

export const testAppConfig: AppConfig = {
  port: 4000,
  corsOrigin: "http://localhost:3000",
  clerkSecretKey: "test-secret",
  groqApiKeys: [],
  groqModel: "openai/gpt-oss-20b",
  isTest: true,
};
