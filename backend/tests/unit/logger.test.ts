import { describe, expect, it } from "vitest";
import { logger } from "../../src/logger.js";

describe("logger", () => {
  it("is silent in test by default", () => {
    expect(logger.level).toBe("silent");
  });
});
