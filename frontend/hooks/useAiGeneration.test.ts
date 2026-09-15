import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiAiPreview, ApiProject } from "../lib/api";
import { useAiGeneration } from "./useAiGeneration";

const { getToken } = vi.hoisted(() => ({
  getToken: vi.fn(async () => "test-token"),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    fetchAiPreviews: vi.fn(),
    regenerateAiPreview: vi.fn(),
    applyAiPreview: vi.fn(),
    fetchAppliedAiGeneration: vi.fn(),
    fetchLatestAiGeneration: vi.fn(),
    rateAiGeneration: vi.fn(),
  };
});

import { toast } from "sonner";
import {
  applyAiPreview,
  fetchAiPreviews,
  fetchAppliedAiGeneration,
  fetchLatestAiGeneration,
  rateAiGeneration,
  regenerateAiPreview,
} from "../lib/api";
import { PREVIEW_LOAD_TIMEOUT_MS } from "../lib/canvas";

const fetchAiPreviewsMock = vi.mocked(fetchAiPreviews);
const fetchAppliedAiGenerationMock = vi.mocked(fetchAppliedAiGeneration);
const fetchLatestAiGenerationMock = vi.mocked(fetchLatestAiGeneration);
const regenerateAiPreviewMock = vi.mocked(regenerateAiPreview);
const applyAiPreviewMock = vi.mocked(applyAiPreview);
const rateAiGenerationMock = vi.mocked(rateAiGeneration);
const toastErrorMock = vi.mocked(toast.error);

function projectWith(
  status: ApiProject["status"],
  id = "project-1",
): ApiProject {
  return {
    id,
    name: "Todo API",
    mode: "prompt",
    status,
    createdAt: "2026-09-05T00:00:00.000Z",
    ownerId: "user-1",
  };
}

const completedPreview: ApiAiPreview = {
  id: "preview-1",
  prompt: "Design a todo API",
  status: "completed",
  result: { records: { "shape:box": { id: "shape:box", typeName: "shape" } } },
  appliedAt: null,
  createdAt: "2026-09-05T00:00:01.000Z",
};

const newerPreview: ApiAiPreview = {
  id: "preview-2",
  prompt: "Design a todo API with auth",
  status: "completed",
  result: {
    records: { "shape:new": { id: "shape:new", typeName: "shape" } },
  },
  appliedAt: null,
  createdAt: "2026-09-05T00:00:02.000Z",
};

const pendingRegeneratePreview: ApiAiPreview = {
  id: "preview-pending",
  prompt: "Design a todo API with auth",
  status: "pending",
  result: null,
  appliedAt: null,
  createdAt: "2026-09-05T00:00:03.000Z",
};

async function flushEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useAiGeneration polling", () => {
  beforeEach(() => {
    getToken.mockClear();
    getToken.mockResolvedValue("test-token");
    fetchAiPreviewsMock.mockReset();
    fetchAppliedAiGenerationMock.mockReset();
    fetchAppliedAiGenerationMock.mockRejectedValue(
      new Error("Applied AI Generation not found"),
    );
    fetchLatestAiGenerationMock.mockReset();
    fetchLatestAiGenerationMock.mockResolvedValue({
      ...completedPreview,
      error: null,
    });
    regenerateAiPreviewMock.mockReset();
    applyAiPreviewMock.mockReset();
    rateAiGenerationMock.mockReset();
    toastErrorMock.mockReset();
    vi.useFakeTimers({
      toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout"],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("polls only the project while generating and does not refetch previews each tick", async () => {
    fetchAiPreviewsMock.mockResolvedValue([]);
    const generating = projectWith("generating");
    const refreshProject = vi.fn(async () => generating);
    const updateProjectInList = vi.fn();

    renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: generating } },
    );

    await flushEffects();

    expect(fetchAiPreviewsMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4500);
    });

    expect(refreshProject.mock.calls.length).toBeGreaterThan(0);
    expect(fetchAiPreviewsMock).not.toHaveBeenCalled();
  });

  it("loads previews once when status is preview and then stops polling", async () => {
    fetchAiPreviewsMock.mockResolvedValue([completedPreview]);
    const preview = projectWith("preview");
    const refreshProject = vi.fn(async () => preview);
    const updateProjectInList = vi.fn();

    const { result, rerender } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: preview } },
    );

    await flushEffects();

    expect(fetchAiPreviewsMock).toHaveBeenCalledTimes(1);
    expect(result.current.previews).toHaveLength(1);
    expect(result.current.selectedPreview?.id).toBe("preview-1");

    rerender({ project: { ...preview } });
    await flushEffects();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4500);
    });

    expect(fetchAiPreviewsMock).toHaveBeenCalledTimes(1);
    expect(refreshProject).not.toHaveBeenCalled();
  });

  it("stops polling when status is failed and loads error plus ratings", async () => {
    fetchAiPreviewsMock.mockResolvedValue([]);
    fetchLatestAiGenerationMock.mockResolvedValue({
      ...completedPreview,
      status: "failed",
      result: null,
      error: "This prompt is not allowed",
    });
    const failed = projectWith("failed");
    const refreshProject = vi.fn(async () => failed);
    const updateProjectInList = vi.fn();

    const { result } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: failed } },
    );

    expect(result.current.generationFailed).toBe(true);
    expect(result.current.generationError).toBeNull();

    await flushEffects();

    expect(result.current.generationError).toBe("This prompt is not allowed");
    expect(result.current.prompt).toBe("Design a todo API");
    expect(fetchLatestAiGenerationMock).toHaveBeenCalled();
    expect(fetchAiPreviewsMock).toHaveBeenCalled();
    expect(toastErrorMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4500);
    });

    expect(refreshProject).not.toHaveBeenCalled();
  });

  it("toasts when polled status becomes failed", async () => {
    fetchAiPreviewsMock.mockResolvedValue([]);
    fetchLatestAiGenerationMock.mockResolvedValue({
      ...completedPreview,
      id: "job-failed",
      status: "failed",
      result: null,
      error: "This prompt is not allowed",
    });
    const generating = projectWith("generating");
    const failed = projectWith("failed");
    const refreshProject = vi.fn(async () => failed);
    const updateProjectInList = vi.fn();

    const { result } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: generating } },
    );

    await flushEffects();

    expect(toastErrorMock).toHaveBeenCalledWith("This prompt is not allowed");
    expect(updateProjectInList).toHaveBeenCalledWith(failed);
    expect(result.current.generationError).toBe("This prompt is not allowed");
    expect(fetchAiPreviewsMock).toHaveBeenCalled();
  });

  it("toasts the job error when regenerate fails and other previews remain", async () => {
    fetchAiPreviewsMock.mockResolvedValue([completedPreview]);
    fetchLatestAiGenerationMock.mockResolvedValue({
      ...completedPreview,
      id: "job-failed",
      status: "failed",
      result: null,
      error: "Generation failed. Please try again.",
    });
    const generating = projectWith("generating");
    const preview = projectWith("preview");
    const refreshProject = vi.fn(async () => preview);
    const updateProjectInList = vi.fn();

    const { result } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: generating } },
    );

    await flushEffects();

    expect(toastErrorMock).toHaveBeenCalledWith(
      "Generation failed. Please try again.",
    );
    expect(result.current.generationError).toBe(
      "Generation failed. Please try again.",
    );
    expect(fetchAiPreviewsMock).toHaveBeenCalled();
  });

  it("loads previews when polled status becomes preview and then stops", async () => {
    fetchAiPreviewsMock.mockResolvedValue([completedPreview]);
    const generating = projectWith("generating");
    const preview = projectWith("preview");
    const refreshProject = vi.fn(async () => preview);
    const updateProjectInList = vi.fn();

    const { rerender } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: generating } },
    );

    await flushEffects();

    expect(refreshProject).toHaveBeenCalledTimes(1);
    expect(fetchAiPreviewsMock).toHaveBeenCalledTimes(1);

    rerender({ project: preview });
    await flushEffects();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4500);
    });

    expect(fetchAiPreviewsMock).toHaveBeenCalledTimes(1);
    expect(refreshProject).toHaveBeenCalledTimes(1);
  });

  it("shows generating state immediately when regenerate starts", async () => {
    fetchAiPreviewsMock.mockResolvedValue([completedPreview]);
    regenerateAiPreviewMock.mockImplementation(
      () => new Promise(() => {}),
    );
    const preview = projectWith("preview");
    const refreshProject = vi.fn(async () => preview);
    const updateProjectInList = vi.fn();

    const { result } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: preview } },
    );

    await flushEffects();

    act(() => {
      void result.current.regenerate();
    });

    expect(result.current.isGenerating).toBe(true);
    expect(result.current.isBusy).toBe(true);
  });

  it("stays busy until regenerated previews load", async () => {
    fetchAiPreviewsMock
      .mockResolvedValueOnce([completedPreview])
      .mockResolvedValueOnce([newerPreview, completedPreview]);
    regenerateAiPreviewMock.mockResolvedValue(pendingRegeneratePreview);
    const preview = projectWith("preview");
    const generating = projectWith("generating");
    const refreshProject = vi
      .fn()
      .mockResolvedValueOnce(generating)
      .mockResolvedValueOnce(preview);
    const updateProjectInList = vi.fn();

    const { result, rerender } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: preview } },
    );

    await flushEffects();

    await act(async () => {
      await result.current.regenerate();
    });

    expect(result.current.isBusy).toBe(true);
    expect(result.current.isGenerating).toBe(true);

    rerender({ project: generating });
    await flushEffects();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await flushEffects();

    rerender({ project: preview });
    await flushEffects();

    expect(result.current.isBusy).toBe(false);
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.selectedPreview?.id).toBe("preview-2");
  });

  it("times out when preview records never load", async () => {
    fetchAiPreviewsMock.mockResolvedValue([]);
    const preview = projectWith("preview");
    const refreshProject = vi.fn(async () => preview);
    const updateProjectInList = vi.fn();

    const { result } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: preview } },
    );

    await flushEffects();
    expect(result.current.previewWaitTimedOut).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PREVIEW_LOAD_TIMEOUT_MS);
    });

    expect(result.current.previewWaitTimedOut).toBe(true);
  });

  it("selects the newest preview when regenerate finishes via polling", async () => {
    fetchAiPreviewsMock
      .mockResolvedValueOnce([completedPreview])
      .mockResolvedValueOnce([newerPreview, completedPreview]);
    regenerateAiPreviewMock.mockResolvedValue(pendingRegeneratePreview);
    const preview = projectWith("preview");
    const generating = projectWith("generating");
    const refreshProject = vi
      .fn()
      .mockResolvedValueOnce(generating)
      .mockResolvedValueOnce(preview);
    const updateProjectInList = vi.fn();

    const { result, rerender } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: preview } },
    );

    await flushEffects();
    expect(result.current.selectedPreview?.id).toBe("preview-1");

    await act(async () => {
      await result.current.regenerate();
    });

    rerender({ project: generating });
    await flushEffects();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await flushEffects();

    rerender({ project: preview });
    await flushEffects();

    expect(result.current.previews).toHaveLength(2);
    expect(result.current.selectedPreview?.id).toBe("preview-2");
  });

  it("selects the newest preview after regenerate when older previews remain", async () => {
    fetchAiPreviewsMock
      .mockResolvedValueOnce([completedPreview])
      .mockResolvedValueOnce([newerPreview, completedPreview]);
    regenerateAiPreviewMock.mockResolvedValue(pendingRegeneratePreview);
    const preview = projectWith("preview");
    const refreshProject = vi.fn(async () => preview);
    const updateProjectInList = vi.fn();

    const { result } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: preview } },
    );

    await flushEffects();
    expect(result.current.selectedPreview?.id).toBe("preview-1");

    await act(async () => {
      await result.current.regenerate();
    });

    expect(result.current.previews).toHaveLength(2);
    expect(result.current.selectedPreview?.id).toBe("preview-2");
    expect(result.current.selectedPreview?.result?.records).toEqual(
      newerPreview.result?.records,
    );
  });

  it("keeps the selected preview when previews reload without regenerate", async () => {
    fetchAiPreviewsMock
      .mockResolvedValueOnce([newerPreview, completedPreview])
      .mockResolvedValueOnce([newerPreview, completedPreview]);
    const preview = projectWith("preview");
    const refreshProject = vi.fn(async () => preview);
    const updateProjectInList = vi.fn();

    const { result } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: preview } },
    );

    await flushEffects();
    expect(result.current.selectedPreview?.id).toBe("preview-2");

    await act(async () => {
      result.current.setSelectedPreviewId("preview-1");
    });
    expect(result.current.selectedPreview?.id).toBe("preview-1");

    await act(async () => {
      await result.current.loadPreviews();
    });

    expect(result.current.selectedPreview?.id).toBe("preview-1");
  });

  it("applies whichever preview is selected", async () => {
    fetchAiPreviewsMock.mockResolvedValue([newerPreview, completedPreview]);
    applyAiPreviewMock.mockResolvedValue(projectWith("ready"));
    const preview = projectWith("preview");
    const refreshProject = vi.fn(async () => preview);
    const updateProjectInList = vi.fn();

    const { result } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: preview } },
    );

    await flushEffects();

    await act(async () => {
      result.current.setSelectedPreviewId("preview-1");
    });

    await act(async () => {
      await result.current.applySelectedPreview();
    });

    expect(applyAiPreviewMock).toHaveBeenCalledWith(
      "test-token",
      "project-1",
      "preview-1",
    );
    expect(result.current.isApplying).toBe(true);
    expect(result.current.isBusy).toBe(true);
    expect(result.current.selectedPreviewId).toBe("preview-1");
  });

  it("shows applying state immediately when apply starts", async () => {
    fetchAiPreviewsMock.mockResolvedValue([completedPreview]);
    applyAiPreviewMock.mockImplementation(() => new Promise(() => {}));
    const preview = projectWith("preview");
    const refreshProject = vi.fn(async () => preview);
    const updateProjectInList = vi.fn();

    const { result } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: preview } },
    );

    await flushEffects();

    act(() => {
      void result.current.applySelectedPreview();
    });

    expect(result.current.isApplying).toBe(true);
    expect(result.current.isBusy).toBe(true);
  });

  it("stays applying until the live canvas is ready", async () => {
    fetchAiPreviewsMock.mockResolvedValue([completedPreview]);
    applyAiPreviewMock.mockResolvedValue(projectWith("ready"));
    const preview = projectWith("preview");
    const ready = projectWith("ready");
    const refreshProject = vi.fn(async () => preview);
    const updateProjectInList = vi.fn();

    const { result, rerender } = renderHook(
      ({ project, liveCanvasReady }) =>
        useAiGeneration(
          project,
          refreshProject,
          updateProjectInList,
          null,
          liveCanvasReady,
        ),
      { initialProps: { project: preview, liveCanvasReady: false } },
    );

    await flushEffects();

    await act(async () => {
      await result.current.applySelectedPreview();
    });

    expect(result.current.isApplying).toBe(true);
    expect(result.current.previews).toHaveLength(1);

    rerender({ project: ready, liveCanvasReady: false });
    expect(result.current.isApplying).toBe(true);

    rerender({ project: ready, liveCanvasReady: true });
    await flushEffects();

    expect(result.current.isApplying).toBe(false);
    expect(result.current.isBusy).toBe(false);
    expect(result.current.previews).toHaveLength(0);
    expect(result.current.selectedPreviewId).toBeNull();
  });

  it("stops applying when apply fails", async () => {
    fetchAiPreviewsMock.mockResolvedValue([completedPreview]);
    applyAiPreviewMock.mockRejectedValueOnce(new Error("Apply failed"));
    const preview = projectWith("preview");
    const refreshProject = vi.fn(async () => preview);
    const updateProjectInList = vi.fn();

    const { result } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: preview } },
    );

    await flushEffects();

    await act(async () => {
      await result.current.applySelectedPreview();
    });

    expect(result.current.isApplying).toBe(false);
    expect(result.current.isBusy).toBe(false);
    expect(result.current.previews).toHaveLength(1);
    expect(toastErrorMock).toHaveBeenCalledWith("Apply failed");
  });

  it("shows a toast when regenerate fails", async () => {
    fetchAiPreviewsMock.mockResolvedValue([completedPreview]);
    regenerateAiPreviewMock.mockRejectedValueOnce(
      new Error("Rate limit exceeded"),
    );
    const preview = projectWith("preview");
    const refreshProject = vi.fn(async () => preview);
    const updateProjectInList = vi.fn();

    const { result } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: preview } },
    );

    await flushEffects();

    await act(async () => {
      await result.current.regenerate();
    });

    expect(toastErrorMock).toHaveBeenCalledWith("Rate limit exceeded");
    expect(result.current.generationError).toBe("Rate limit exceeded");
  });

  it("does not set a fallback error before the failed job is loaded", async () => {
    let resolveLatest: (value: ApiAiPreview) => void = () => undefined;
    fetchAiPreviewsMock.mockResolvedValue([]);
    fetchLatestAiGenerationMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLatest = resolve;
        }),
    );
    const failed = projectWith("failed");
    const refreshProject = vi.fn(async () => failed);
    const updateProjectInList = vi.fn();

    const { result } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: failed } },
    );

    await flushEffects();

    expect(result.current.generationFailed).toBe(true);
    expect(result.current.generationError).toBeNull();

    await act(async () => {
      resolveLatest({
        ...completedPreview,
        status: "failed",
        result: null,
        error: "This prompt is not allowed",
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.generationError).toBe("This prompt is not allowed");
  });

  it("fills the prompt from the failed generate job when the box is empty", async () => {
    fetchAiPreviewsMock.mockResolvedValue([]);
    fetchLatestAiGenerationMock.mockResolvedValue({
      id: "job-failed",
      prompt: "Design a payments API",
      status: "failed",
      result: null,
      appliedAt: null,
      createdAt: "2026-09-05T00:00:01.000Z",
      error: "Failed to generate JSON",
    });
    const failed = projectWith("failed");
    const refreshProject = vi.fn(async () => failed);
    const updateProjectInList = vi.fn();

    const { result } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: failed } },
    );

    expect(result.current.prompt).toBe("");

    await flushEffects();

    expect(result.current.prompt).toBe("Design a payments API");
    expect(result.current.generationError).toBe("Failed to generate JSON");
  });

  it("replaces the prompt when switching from another prompt project to a first-time failed project", async () => {
    fetchAiPreviewsMock.mockResolvedValue([completedPreview]);
    fetchLatestAiGenerationMock.mockResolvedValue({
      ...completedPreview,
      error: null,
    });
    const preview = projectWith("preview", "rag-project");
    const failed = projectWith("failed", "threat-project");
    const refreshProject = vi.fn(async (projectId: string) =>
      projectId === failed.id ? failed : preview,
    );
    const updateProjectInList = vi.fn();

    const { result, rerender } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: preview } },
    );

    await flushEffects();
    expect(result.current.prompt).toBe("Design a todo API");

    fetchAiPreviewsMock.mockResolvedValue([]);
    fetchLatestAiGenerationMock.mockResolvedValue({
      id: "job-failed",
      prompt: "make a threat model",
      status: "failed",
      result: null,
      appliedAt: null,
      createdAt: "2026-09-05T00:00:01.000Z",
      error: "This prompt is not allowed",
    });

    rerender({ project: failed });
    await flushEffects();

    expect(result.current.prompt).toBe("make a threat model");
    expect(result.current.generationError).toBe("This prompt is not allowed");
  });

  it("keeps the previous error while regenerate is in flight", async () => {
    fetchAiPreviewsMock.mockResolvedValue([]);
    fetchLatestAiGenerationMock.mockResolvedValue({
      ...completedPreview,
      status: "failed",
      result: null,
      error: "Invalid API key",
    });
    regenerateAiPreviewMock.mockImplementation(() => new Promise(() => {}));
    const failed = projectWith("failed");
    const refreshProject = vi.fn(async () => failed);
    const updateProjectInList = vi.fn();

    const { result } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: failed } },
    );

    await flushEffects();
    expect(result.current.generationError).toBe("Invalid API key");
    expect(result.current.prompt).toBe("Design a todo API");

    act(() => {
      void result.current.regenerate();
    });

    expect(result.current.isGenerating).toBe(true);
    expect(result.current.generationError).toBe("Invalid API key");
  });

  it("refetches likes after a rating save fails so the thumb matches the server", async () => {
    fetchAiPreviewsMock
      .mockResolvedValueOnce([{ ...completedPreview, rating: "up" }])
      .mockResolvedValueOnce([{ ...completedPreview, rating: "up" }]);
    rateAiGenerationMock.mockRejectedValueOnce(new Error("Failed to save rating"));
    const preview = projectWith("preview");
    const refreshProject = vi.fn(async () => preview);
    const updateProjectInList = vi.fn();

    const { result } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: preview } },
    );

    await flushEffects();
    expect(result.current.previews[0]?.rating).toBe("up");

    await act(async () => {
      await result.current.rateJob("preview-1", "down");
    });

    expect(result.current.previews[0]?.rating).toBe("up");
    expect(fetchAiPreviewsMock).toHaveBeenCalledTimes(2);
  });

  it("shows the rating immediately while save is in flight", async () => {
    fetchAiPreviewsMock.mockResolvedValue([{ ...completedPreview, rating: null }]);
    rateAiGenerationMock.mockImplementation(() => new Promise(() => {}));
    const preview = projectWith("preview");
    const refreshProject = vi.fn(async () => preview);
    const updateProjectInList = vi.fn();

    const { result } = renderHook(
      ({ project }) =>
        useAiGeneration(project, refreshProject, updateProjectInList),
      { initialProps: { project: preview } },
    );

    await flushEffects();

    act(() => {
      void result.current.rateJob("preview-1", "up");
    });

    expect(result.current.previews[0]?.rating).toBe("up");
  });

  it("marks applied job loading until the ready generate job is fetched", async () => {
    let resolveJob: (value: ApiAiPreview) => void = () => undefined;
    fetchAppliedAiGenerationMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveJob = resolve;
        }),
    );
    const ready = projectWith("ready");
    const refreshProject = vi.fn(async () => ready);
    const updateProjectInList = vi.fn();

    const { result } = renderHook(() =>
      useAiGeneration(ready, refreshProject, updateProjectInList),
    );

    expect(result.current.isAppliedJobLoading).toBe(true);
    expect(result.current.appliedJob).toBeNull();

    await flushEffects();
    expect(result.current.isAppliedJobLoading).toBe(true);

    await act(async () => {
      resolveJob({
        ...completedPreview,
        appliedAt: "2026-09-14T00:01:00.000Z",
        rating: null,
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.isAppliedJobLoading).toBe(false);
    expect(result.current.appliedJob?.id).toBe("preview-1");
  });

  it("does not wait for an applied job on a blank ready Project", async () => {
    const blank: ApiProject = { ...projectWith("ready"), mode: "blank" };
    const refreshProject = vi.fn(async () => blank);
    const updateProjectInList = vi.fn();

    const { result } = renderHook(() =>
      useAiGeneration(blank, refreshProject, updateProjectInList),
    );

    expect(result.current.isAppliedJobLoading).toBe(false);
    await flushEffects();
    expect(fetchAppliedAiGenerationMock).not.toHaveBeenCalled();
  });
});
