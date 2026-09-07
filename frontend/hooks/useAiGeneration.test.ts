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
  };
});

import { toast } from "sonner";
import {
  applyAiPreview,
  fetchAiPreviews,
  regenerateAiPreview,
} from "../lib/api";
import { PREVIEW_LOAD_TIMEOUT_MS } from "../lib/canvas";

const fetchAiPreviewsMock = vi.mocked(fetchAiPreviews);
const regenerateAiPreviewMock = vi.mocked(regenerateAiPreview);
const applyAiPreviewMock = vi.mocked(applyAiPreview);
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
    regenerateAiPreviewMock.mockReset();
    applyAiPreviewMock.mockReset();
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

  it("stops polling when status is failed and does not fetch previews", async () => {
    fetchAiPreviewsMock.mockResolvedValue([]);
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
    expect(fetchAiPreviewsMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4500);
    });

    expect(refreshProject).not.toHaveBeenCalled();
    expect(fetchAiPreviewsMock).not.toHaveBeenCalled();
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
    regenerateAiPreviewMock.mockResolvedValue(undefined);
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
    regenerateAiPreviewMock.mockResolvedValue(undefined);
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
    regenerateAiPreviewMock.mockResolvedValue(undefined);
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
  });
});
