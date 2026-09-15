import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ApiProject } from "../lib/api";
import type { useAiGeneration } from "../hooks/useAiGeneration";
import { AiSidebar } from "./AiSidebar";

type AiState = ReturnType<typeof useAiGeneration>;

function projectWith(
  status: ApiProject["status"],
  mode: ApiProject["mode"] = "prompt",
): ApiProject {
  return {
    id: "project-1",
    name: "Todo API",
    mode,
    status,
    createdAt: "2026-09-14T00:00:00.000Z",
    ownerId: "user-1",
  };
}

function aiState(overrides: Partial<AiState> = {}): AiState {
  return {
    prompt: "Design a todo API",
    setPrompt: () => undefined,
    previews: [],
    selectedPreview: null,
    selectedPreviewId: null,
    setSelectedPreviewId: () => undefined,
    appliedJob: null,
    rateJob: async () => undefined,
    isBusy: false,
    isApplying: false,
    isGenerating: false,
    generationFailed: false,
    generationError: null,
    previewWaitTimedOut: false,
    regenerate: async () => undefined,
    applySelectedPreview: async () => undefined,
    loadPreviews: async () => undefined,
    ...overrides,
  };
}

describe("AiSidebar ratings", () => {
  it("shows thumbs on each Preview row for the author, with no caption", () => {
    render(
      <AiSidebar
        project={projectWith("preview")}
        ai={aiState({
          previews: [
            {
              id: "preview-1",
              prompt: "Design a todo API",
              status: "completed",
              result: { records: {} },
              appliedAt: null,
              createdAt: "2026-09-14T00:00:01.000Z",
              rating: null,
            },
          ],
          selectedPreviewId: "preview-1",
        })}
        agentAllowed={false}
        onAgentAllowedChange={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "Rate up" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rate down" })).toBeTruthy();
    expect(screen.queryByText("Did you like this AI generation?")).toBeNull();
  });

  it("hides Preview thumbs when rating is omitted for a Collaborator", () => {
    render(
      <AiSidebar
        project={projectWith("preview")}
        ai={aiState({
          previews: [
            {
              id: "preview-1",
              prompt: "Design a todo API",
              status: "completed",
              result: { records: {} },
              appliedAt: null,
              createdAt: "2026-09-14T00:00:01.000Z",
            },
          ],
          selectedPreviewId: "preview-1",
        })}
        agentAllowed={false}
        onAgentAllowedChange={() => undefined}
      />,
    );

    expect(screen.queryByRole("button", { name: "Rate up" })).toBeNull();
  });

  it("shows the after-Apply caption for the author only", () => {
    const { rerender } = render(
      <AiSidebar
        project={projectWith("ready")}
        ai={aiState({
          appliedJob: {
            id: "preview-1",
            prompt: "Design a todo API",
            status: "completed",
            result: { records: {} },
            appliedAt: "2026-09-14T00:01:00.000Z",
            createdAt: "2026-09-14T00:00:01.000Z",
            rating: null,
          },
        })}
        agentAllowed={false}
        onAgentAllowedChange={() => undefined}
      />,
    );

    expect(screen.getByText("Did you like this AI generation?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rate up" })).toBeTruthy();

    rerender(
      <AiSidebar
        project={projectWith("ready")}
        ai={aiState({
          appliedJob: {
            id: "preview-1",
            prompt: "Design a todo API",
            status: "completed",
            result: { records: {} },
            appliedAt: "2026-09-14T00:01:00.000Z",
            createdAt: "2026-09-14T00:00:01.000Z",
          },
        })}
        agentAllowed={false}
        onAgentAllowedChange={() => undefined}
      />,
    );

    expect(screen.queryByText("Did you like this AI generation?")).toBeNull();
    expect(screen.queryByRole("button", { name: "Rate up" })).toBeNull();
  });

  it("shows the generate job error just above the prompt box", () => {
    render(
      <AiSidebar
        project={projectWith("failed")}
        ai={aiState({
          generationFailed: true,
          generationError: "This prompt is not allowed",
        })}
        agentAllowed={false}
        onAgentAllowedChange={() => undefined}
      />,
    );

    const error = screen.getByText("This prompt is not allowed");
    const prompt = screen.getByPlaceholderText("Describe the system...");
    expect(
      error.compareDocumentPosition(prompt) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows loading reason above the prompt box until the generate error arrives", () => {
    render(
      <AiSidebar
        project={projectWith("failed")}
        ai={aiState({
          generationFailed: true,
          generationError: null,
        })}
        agentAllowed={false}
        onAgentAllowedChange={() => undefined}
      />,
    );

    const loading = screen.getByText("Loading reason...");
    const prompt = screen.getByPlaceholderText("Describe the system...");
    expect(screen.queryByText("Generation failed. Please try again.")).toBeNull();
    expect(
      loading.compareDocumentPosition(prompt) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("does not show loading reason while regenerating a failed project", () => {
    render(
      <AiSidebar
        project={projectWith("failed")}
        ai={aiState({
          generationFailed: true,
          generationError: "Invalid API key",
          isGenerating: true,
        })}
        agentAllowed={false}
        onAgentAllowedChange={() => undefined}
      />,
    );

    expect(screen.queryByText("Loading reason...")).toBeNull();
    expect(screen.queryByText("Invalid API key")).toBeNull();
  });

  it("disables Apply preview while applying", () => {
    render(
      <AiSidebar
        project={projectWith("preview")}
        ai={aiState({
          previews: [
            {
              id: "preview-1",
              prompt: "Design a todo API",
              status: "completed",
              result: { records: {} },
              appliedAt: null,
              createdAt: "2026-09-14T00:00:01.000Z",
              rating: null,
            },
          ],
          selectedPreviewId: "preview-1",
          isApplying: true,
        })}
        agentAllowed={false}
        onAgentAllowedChange={() => undefined}
      />,
    );

    const applyButton = screen.getByRole("button", {
      name: "Applying...",
    }) as HTMLButtonElement;

    expect(applyButton.disabled).toBe(true);
    expect(applyButton.className).toContain("opacity-60");
  });

  it("shows a loading state while generating a Preview", () => {
    render(
      <AiSidebar
        project={projectWith("generating")}
        ai={aiState({ isGenerating: true })}
        agentAllowed={false}
        onAgentAllowedChange={() => undefined}
      />,
    );

    expect(screen.getByText("Generating preview...")).toBeTruthy();
  });

  it("shows a loading state while WebMCP is connecting", () => {
    render(
      <AiSidebar
        project={projectWith("ready", "blank")}
        ai={aiState()}
        agentAllowed={false}
        isAgentLoading
        onAgentAllowedChange={() => undefined}
      />,
    );

    expect(screen.getByText("Loading WebMCP...")).toBeTruthy();
  });
});
