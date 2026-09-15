import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  groqKeyForAttempt,
  parseGroqApiKeys,
  resetGroqKeyCursor,
  runWithGroqKeySlot,
  startGroqKeyIndex,
  takeGroqApiKey,
} from "../../src/ai/groq-keys.js";

describe("Groq API key round robin", () => {
  beforeEach(() => {
    resetGroqKeyCursor();
  });

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

  it("keeps the same starting key for every Groq call in one job", async () => {
    const keys = ["k1", "k2", "k3"];

    await runWithGroqKeySlot(keys, async () => {
      expect(startGroqKeyIndex(keys)).toBe(0);
      expect(startGroqKeyIndex(keys)).toBe(0);
      expect(groqKeyForAttempt(keys, startGroqKeyIndex(keys), 0)).toBe("k1");
      expect(groqKeyForAttempt(keys, startGroqKeyIndex(keys), 1)).toBe("k2");
    });

    await runWithGroqKeySlot(keys, async () => {
      expect(startGroqKeyIndex(keys)).toBe(1);
      expect(groqKeyForAttempt(keys, startGroqKeyIndex(keys), 0)).toBe("k2");
    });

    await runWithGroqKeySlot(keys, async () => {
      expect(startGroqKeyIndex(keys)).toBe(2);
      expect(groqKeyForAttempt(keys, startGroqKeyIndex(keys), 0)).toBe("k3");
    });
  });
});
