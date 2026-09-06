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

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    fetchAiPreviews: vi.fn(),
    regenerateAiPreview: vi.fn(),
    applyAiPreview: vi.fn(),
  };
});

import { fetchAiPreviews } from "../lib/api";

const fetchAiPreviewsMock = vi.mocked(fetchAiPreviews);

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
    vi.useFakeTimers({
      toFake: ["setInterval", "clearInterval"],
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
    expect(fetchAiPreviewsMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
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
});
