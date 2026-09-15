import { describe, expect, it } from "vitest";
import { createMemoryAiRateLimiter } from "../../src/ai/rate-limit.js";
import { createMemoryProjectCreateRateLimiter } from "../../src/projects/create-quota.js";

describe("AI generate quota", () => {
  it("rejects the 6th generate without counting past 5", async () => {
    const { limiter, getCount } = createMemoryAiRateLimiter();

    for (let index = 1; index <= 5; index += 1) {
      expect(await limiter.consume("user-1", "generate")).toBe("ok");
    }

    expect(await limiter.consume("user-1", "generate")).toBe("limited");
    expect(await limiter.consume("user-1", "generate")).toBe("limited");
    expect(getCount("user-1", "generate")).toBe(5);
  });
});

describe("Project create quota", () => {
  it("rejects the 11th create without counting past 10", async () => {
    const { limiter, getCount } = createMemoryProjectCreateRateLimiter();

    for (let index = 1; index <= 10; index += 1) {
      expect(await limiter.consume("user-1")).toBe("ok");
    }

    expect(await limiter.consume("user-1")).toBe("limited");
    expect(await limiter.consume("user-1")).toBe("limited");
    expect(getCount("user-1")).toBe(10);
  });
});
