import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config.js";

const envKeys = [
  "NODE_ENV",
  "CLERK_SECRET_KEY",
  "SMTP_USER",
  "SMTP_PASS",
  "GROQ_MODEL",
  "GROQ_API_KEY",
  "GROQ_API_KEY_2",
  "GROQ_API_KEY_3",
] as const;

describe("loadConfig", () => {
  const previous = new Map<string, string | undefined>();

  afterEach(() => {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    previous.clear();
  });

  function setEnv(key: (typeof envKeys)[number], value: string | undefined) {
    if (!previous.has(key)) {
      previous.set(key, process.env[key]);
    }
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  it("throws before boot when SMTP user or pass is missing", () => {
    setEnv("NODE_ENV", "production");
    setEnv("CLERK_SECRET_KEY", "sk_test");
    setEnv("SMTP_USER", undefined);
    setEnv("SMTP_PASS", undefined);

    expect(() => loadConfig()).toThrow("SMTP_USER and SMTP_PASS are required");
  });

  it("lets tests boot without SMTP", () => {
    setEnv("NODE_ENV", "test");
    setEnv("SMTP_USER", undefined);
    setEnv("SMTP_PASS", undefined);

    expect(loadConfig().isTest).toBe(true);
  });

  it("defaults to openai/gpt-oss-120b when GROQ_MODEL is unset", () => {
    setEnv("NODE_ENV", "test");
    setEnv("GROQ_MODEL", undefined);

    expect(loadConfig().groqModel).toBe("openai/gpt-oss-120b");
  });

  it("lets GROQ_MODEL override the default", () => {
    setEnv("NODE_ENV", "test");
    setEnv("GROQ_MODEL", "openai/gpt-oss-20b");

    expect(loadConfig().groqModel).toBe("openai/gpt-oss-20b");
  });

  it("collects Groq keys for round robin", () => {
    setEnv("NODE_ENV", "test");
    setEnv("GROQ_API_KEY", "key-a");
    setEnv("GROQ_API_KEY_2", "key-b");
    setEnv("GROQ_API_KEY_3", "key-c");

    expect(loadConfig().groqApiKeys).toEqual(["key-a", "key-b", "key-c"]);
  });
});
