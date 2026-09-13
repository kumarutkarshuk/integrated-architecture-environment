import { describe, expect, it } from "vitest";
import { InvalidDiagramPlanError, InvalidInferenceJsonError } from "../../src/ai/diagram-plan.js";
import { shouldSkipGenerateRetry } from "../../src/ai/generate-service.js";

describe("shouldSkipGenerateRetry", () => {
  it("lets Trigger.dev retry a bad Plan once", () => {
    expect(shouldSkipGenerateRetry(new InvalidDiagramPlanError("unknown kind"), 1)).toBe(false);
    expect(shouldSkipGenerateRetry(new InvalidDiagramPlanError("unknown kind"), 2)).toBe(true);
  });

  it("lets Trigger.dev retry bad JSON once", () => {
    expect(shouldSkipGenerateRetry(new InvalidInferenceJsonError("not json"), 1)).toBe(false);
    expect(shouldSkipGenerateRetry(new InvalidInferenceJsonError("not json"), 2)).toBe(true);
  });

  it("does not stop retries for network errors", () => {
    expect(shouldSkipGenerateRetry(new Error("Groq timeout"), 1)).toBe(false);
    expect(shouldSkipGenerateRetry(new Error("Groq timeout"), 2)).toBe(false);
    expect(shouldSkipGenerateRetry(new Error("Groq timeout"), 3)).toBe(false);
  });
});
