import { describe, expect, it } from "vitest";
import { InvalidInferenceJsonError } from "../../src/ai/diagram-plan.js";
import {
  EXPORT_SPEC_FAILED_MESSAGE,
  EXPORT_SPEC_INCOMPLETE_MESSAGE,
  shouldSkipExportSpecRetry,
  summarizeExportSpecFailure,
} from "../../src/ai/export-spec-service.js";

describe("shouldSkipExportSpecRetry", () => {
  it("lets Trigger.dev retry missing markdown once", () => {
    expect(
      shouldSkipExportSpecRetry(
        new InvalidInferenceJsonError("Export spec result must include markdown"),
        1,
      ),
    ).toBe(false);
    expect(
      shouldSkipExportSpecRetry(
        new InvalidInferenceJsonError("Export spec result must include markdown"),
        2,
      ),
    ).toBe(true);
  });

  it("does not stop retries for network errors", () => {
    expect(shouldSkipExportSpecRetry(new Error("Groq timeout"), 1)).toBe(false);
    expect(shouldSkipExportSpecRetry(new Error("Groq timeout"), 2)).toBe(false);
  });
});

describe("summarizeExportSpecFailure", () => {
  it("maps missing markdown to a short reason", () => {
    expect(
      summarizeExportSpecFailure(
        new InvalidInferenceJsonError("Export spec result must include markdown"),
      ),
    ).toBe(EXPORT_SPEC_INCOMPLETE_MESSAGE);
  });

  it("maps invalid JSON to a short reason", () => {
    expect(
      summarizeExportSpecFailure(
        new InvalidInferenceJsonError("Groq response was not valid JSON"),
      ),
    ).toBe("Failed to generate JSON");
  });

  it("maps an invalid API key to a short reason", () => {
    expect(summarizeExportSpecFailure(new Error("Invalid API Key"))).toBe(
      "Invalid API key",
    );
  });

  it("falls back when the worker did not pass an error", () => {
    expect(summarizeExportSpecFailure()).toBe(EXPORT_SPEC_FAILED_MESSAGE);
  });
});
