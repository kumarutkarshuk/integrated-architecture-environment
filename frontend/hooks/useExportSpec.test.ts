import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiAiJob, ApiProject } from "../lib/api";
import { useExportSpec } from "./useExportSpec";

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
    startExportSpec: vi.fn(),
    fetchAiJob: vi.fn(),
  };
});

import { fetchAiJob, startExportSpec } from "../lib/api";

const startExportSpecMock = vi.mocked(startExportSpec);
const fetchAiJobMock = vi.mocked(fetchAiJob);

function projectWith(
  status: ApiProject["status"],
  id = "project-1",
): ApiProject {
  return {
    id,
    name: "Todo API",
    mode: "blank",
    status,
    createdAt: "2026-09-06T00:00:00.000Z",
    ownerId: "user-1",
  };
}

const pendingJob: ApiAiJob = {
  id: "export-1",
  type: "export_spec",
  prompt: null,
  status: "pending",
  result: null,
  appliedAt: null,
  createdAt: "2026-09-06T00:00:01.000Z",
};

const completedJob: ApiAiJob = {
  ...pendingJob,
  status: "completed",
  result: {
    markdown: "# Todo API\n\nUsers talk to the API Gateway.",
    gaps_summary: "Storage is not shown on the canvas.",
  },
};

async function flushEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useExportSpec", () => {
  beforeEach(() => {
    getToken.mockClear();
    getToken.mockResolvedValue("test-token");
    startExportSpecMock.mockReset();
    fetchAiJobMock.mockReset();
    vi.useFakeTimers({
      toFake: ["setInterval", "clearInterval"],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows Export Spec only on a ready Project", () => {
    const { result, rerender } = renderHook(
      ({ project }) => useExportSpec(project),
      { initialProps: { project: projectWith("preview") } },
    );

    expect(result.current.canExport).toBe(false);

    rerender({ project: projectWith("ready") });
    expect(result.current.canExport).toBe(true);
  });

  it("polls the export_spec job and exposes markdown and gaps_summary", async () => {
    startExportSpecMock.mockResolvedValue(pendingJob);
    fetchAiJobMock.mockResolvedValueOnce({ ...pendingJob, status: "running" });
    fetchAiJobMock.mockResolvedValueOnce(completedJob);

    const { result } = renderHook(() => useExportSpec(projectWith("ready")));

    await act(async () => {
      await result.current.exportSpec();
    });

    expect(startExportSpecMock).toHaveBeenCalledWith("test-token", "project-1");
    expect(result.current.isExporting).toBe(true);
    expect(result.current.spec).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    await flushEffects();

    expect(result.current.spec).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    await flushEffects();

    expect(result.current.isExporting).toBe(false);
    expect(result.current.spec).toEqual({
      markdown: "# Todo API\n\nUsers talk to the API Gateway.",
      gaps_summary: "Storage is not shown on the canvas.",
    });
    expect(result.current.downloadFileName).toBe("todo-api-spec.md");

    const blobParts: unknown[] = [];
    const OriginalBlob = globalThis.Blob;
    vi.stubGlobal(
      "Blob",
      class MockBlob {
        constructor(parts: unknown[]) {
          blobParts.push(...parts);
        }
      },
    );
    URL.createObjectURL = vi.fn(() => "blob:spec") as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL;

    await act(async () => {
      result.current.downloadSpec();
    });

    expect(String(blobParts[0])).toContain("# Todo API");
    expect(String(blobParts[0])).toContain("## Gaps summary");
    expect(String(blobParts[0])).toContain("Storage is not shown on the canvas.");

    vi.unstubAllGlobals();
    globalThis.Blob = OriginalBlob;

    const writeText = vi.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    await act(async () => {
      await result.current.copySpec();
    });

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("## Gaps summary"),
    );
  });

  it("surfaces an error when the export_spec job fails", async () => {
    startExportSpecMock.mockResolvedValue(pendingJob);
    fetchAiJobMock.mockResolvedValue({
      ...pendingJob,
      status: "failed",
    });

    const { result } = renderHook(() => useExportSpec(projectWith("ready")));

    await act(async () => {
      await result.current.exportSpec();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    await flushEffects();

    expect(result.current.isExporting).toBe(false);
    expect(result.current.spec).toBeNull();
    expect(result.current.error).toBe("Export Spec failed");
  });
});
