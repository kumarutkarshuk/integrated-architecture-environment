import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config.js";

const envKeys = [
  "NODE_ENV",
  "CLERK_SECRET_KEY",
  "BREVO_SMTP_LOGIN",
  "BREVO_SMTP_KEY",
  "BREVO_FROM",
  "GROQ_MODEL",
  "GROQ_API_KEY",
  "GROQ_API_KEY_2",
  "GROQ_API_KEY_3",
  "GROQ_PROMPT_GUARD_MODEL",
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

  it("throws before boot when Brevo mail settings are missing", () => {
    setEnv("NODE_ENV", "production");
    setEnv("CLERK_SECRET_KEY", "sk_test");
    setEnv("BREVO_SMTP_LOGIN", undefined);
    setEnv("BREVO_SMTP_KEY", undefined);
    setEnv("BREVO_FROM", undefined);

    expect(() => loadConfig()).toThrow(
      "BREVO_SMTP_LOGIN, BREVO_SMTP_KEY, and BREVO_FROM are required",
    );
  });

  it("lets tests boot without SMTP", () => {
    setEnv("NODE_ENV", "test");
    setEnv("BREVO_SMTP_LOGIN", undefined);
    setEnv("BREVO_SMTP_KEY", undefined);
    setEnv("BREVO_FROM", undefined);

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

  it("defaults the prompt guard model to openai/gpt-oss-20b", () => {
    setEnv("NODE_ENV", "test");
    setEnv("GROQ_PROMPT_GUARD_MODEL", undefined);

    expect(loadConfig().groqPromptGuardModel).toBe("openai/gpt-oss-20b");
  });

  it("lets GROQ_PROMPT_GUARD_MODEL override the prompt guard model", () => {
    setEnv("NODE_ENV", "test");
    setEnv("GROQ_PROMPT_GUARD_MODEL", "openai/gpt-oss-120b");

    expect(loadConfig().groqPromptGuardModel).toBe("openai/gpt-oss-120b");
  });

  it("collects Groq keys for round robin", () => {
    setEnv("NODE_ENV", "test");
    setEnv("GROQ_API_KEY", "key-a");
    setEnv("GROQ_API_KEY_2", "key-b");
    setEnv("GROQ_API_KEY_3", "key-c");

    expect(loadConfig().groqApiKeys).toEqual(["key-a", "key-b", "key-c"]);
  });
});
