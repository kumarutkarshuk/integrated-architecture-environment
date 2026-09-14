import { afterEach, describe, expect, it } from "vitest";
import {
  parseGroqApiKeys,
  resetGroqKeyCursor,
  takeGroqApiKey,
} from "../../src/ai/groq-keys.js";

describe("Groq API key round robin", () => {
  afterEach(() => {
    resetGroqKeyCursor();
  });

  it("reads GROQ_API_KEY plus numbered and comma-separated keys", () => {
    expect(
      parseGroqApiKeys({
        GROQ_API_KEY: "key-a",
        GROQ_API_KEY_2: "key-b",
        GROQ_API_KEY_3: " key-c ",
        GROQ_API_KEYS: "key-a,key-d",
      }),
    ).toEqual(["key-a", "key-b", "key-c", "key-d"]);
  });

  it("walks keys in round-robin order", () => {
    const keys = ["k1", "k2", "k3"];
    expect(takeGroqApiKey(keys)).toBe("k1");
    expect(takeGroqApiKey(keys)).toBe("k2");
    expect(takeGroqApiKey(keys)).toBe("k3");
    expect(takeGroqApiKey(keys)).toBe("k1");
  });
});
