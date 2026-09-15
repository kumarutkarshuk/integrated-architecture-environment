import type { AppConfig } from "../src/config.js";

export const testAppConfig: AppConfig = {
  host: "127.0.0.1",
  port: 4000,
  corsOrigin: "http://localhost:3000",
  clerkSecretKey: "test-secret",
  groqApiKeys: [],
  groqModel: "openai/gpt-oss-20b",
  groqPromptGuardModel: "openai/gpt-oss-20b",
  isTest: true,
};
