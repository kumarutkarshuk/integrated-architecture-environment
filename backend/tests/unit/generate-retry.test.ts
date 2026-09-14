import { describe, expect, it } from "vitest";
import { InvalidDiagramPlanError, InvalidInferenceJsonError } from "../../src/ai/diagram-plan.js";
import {
  GENERATE_FAILED_MESSAGE,
  shouldSkipGenerateRetry,
  summarizeGenerateFailure,
} from "../../src/ai/generate-service.js";

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

describe("summarizeGenerateFailure", () => {
  it("maps invalid JSON to a short reason", () => {
    expect(
      summarizeGenerateFailure(
        new InvalidInferenceJsonError("Groq response was not valid JSON"),
      ),
    ).toBe("Failed to generate JSON");
  });

  it("maps an invalid API key to a short reason", () => {
    expect(summarizeGenerateFailure(new Error("Invalid API Key"))).toBe(
      "Invalid API key",
    );
    expect(summarizeGenerateFailure({ message: "Invalid API Key" })).toBe(
      "Invalid API key",
    );
  });

  it("keeps a concise worker message", () => {
    expect(
      summarizeGenerateFailure(new InvalidDiagramPlanError("unknown kind")),
    ).toBe("unknown kind");
  });

  it("falls back when the worker did not pass an error", () => {
    expect(summarizeGenerateFailure()).toBe(GENERATE_FAILED_MESSAGE);
  });
});
