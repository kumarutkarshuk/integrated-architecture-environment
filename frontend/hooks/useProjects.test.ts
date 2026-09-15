import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiProject } from "../lib/api";
import { useProjects } from "./useProjects";

const { getToken } = vi.hoisted(() => ({
  getToken: vi.fn(async () => "test-token"),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken }),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>(
    "../lib/api",
  );
  return {
    ...actual,
    fetchProjects: vi.fn(),
    fetchProject: vi.fn(),
    createProject: vi.fn(),
    deleteProject: vi.fn(),
  };
});

import {
  createProject,
  deleteProject,
  fetchProject,
  fetchProjects,
} from "../lib/api";

const fetchProjectsMock = vi.mocked(fetchProjects);
const fetchProjectMock = vi.mocked(fetchProject);
const createProjectMock = vi.mocked(createProject);
const deleteProjectMock = vi.mocked(deleteProject);

function project(id: string, name = id): ApiProject {
  return {
    id,
    name,
    mode: "blank",
    status: "ready",
    createdAt: "2026-09-05T00:00:00.000Z",
    ownerId: "user-1",
  };
}

async function flushEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useProjects", () => {
  beforeEach(() => {
    getToken.mockClear();
    getToken.mockResolvedValue("test-token");
    fetchProjectsMock.mockReset();
    fetchProjectMock.mockReset();
    createProjectMock.mockReset();
    deleteProjectMock.mockReset();
    vi.useFakeTimers({
      toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout"],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("drops a deleted Project on the next list poll", async () => {
    const owned = project("owned", "Owned");
    const shared = project("shared", "Shared");
    fetchProjectsMock.mockResolvedValueOnce([owned, shared]);

    const { result } = renderHook(() => useProjects(true));
    await flushEffects();

    expect(result.current.projects.map((entry) => entry.id)).toEqual([
      "owned",
      "shared",
    ]);

    fetchProjectsMock.mockResolvedValueOnce([owned]);
    await act(async () => {
      vi.advanceTimersByTime(2500);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.projects.map((entry) => entry.id)).toEqual(["owned"]);
    expect(result.current.isLoading).toBe(false);
  });

  it("drops a Project when a refresh gets Project not found", async () => {
    const shared = project("shared", "Shared");
    fetchProjectsMock.mockResolvedValue([shared]);

    const { result } = renderHook(() => useProjects(true));
    await flushEffects();

    fetchProjectMock.mockRejectedValueOnce(new Error("Project not found"));
    await act(async () => {
      await expect(result.current.refreshProject("shared")).rejects.toThrow(
        "Project not found",
      );
    });
    expect(result.current.projects).toEqual([]);
  });
});
