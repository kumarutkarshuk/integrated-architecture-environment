import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOpenProject } from "./useOpenProject";

const { replace, push, getProjectParam, setProjectParam } = vi.hoisted(() => {
  let projectParam: string | null = null;

  return {
    replace: vi.fn(),
    push: vi.fn(),
    getProjectParam: () => projectParam,
    setProjectParam: (value: string | null) => {
      projectParam = value;
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
  useSearchParams: () => ({
    get: (key: string) => (key === "project" ? getProjectParam() : null),
  }),
}));

const accessibleProjects = [{ id: "project-1" }, { id: "project-2" }];

describe("useOpenProject", () => {
  beforeEach(() => {
    replace.mockReset();
    push.mockReset();
    setProjectParam(null);
  });

  it("writes the selected Project to the query with replace", () => {
    const { result } = renderHook(() =>
      useOpenProject(accessibleProjects, { isLoading: false, error: null }),
    );

    act(() => {
      result.current.selectProject("project-2");
    });

    expect(result.current.selectedProjectId).toBe("project-2");
    expect(replace).toHaveBeenCalledWith("/workspace?project=project-2");
    expect(push).not.toHaveBeenCalled();
  });

  it("reopens the Project from the query after projects load", () => {
    setProjectParam("project-1");

    const { result, rerender } = renderHook(
      ({ projects, load }) => useOpenProject(projects, load),
      {
        initialProps: {
          projects: [] as Array<{ id: string }>,
          load: { isLoading: true, error: null as string | null },
        },
      },
    );

    expect(result.current.selectedProjectId).toBeNull();
    expect(replace).not.toHaveBeenCalled();

    rerender({
      projects: accessibleProjects,
      load: { isLoading: false, error: null },
    });

    expect(result.current.selectedProjectId).toBe("project-1");
    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("clears selection and the query when the id is missing or not accessible", () => {
    setProjectParam("gone-project");

    const { result, rerender } = renderHook(
      ({ projects, load }) => useOpenProject(projects, load),
      {
        initialProps: {
          projects: [] as Array<{ id: string }>,
          load: { isLoading: true, error: null as string | null },
        },
      },
    );

    rerender({
      projects: accessibleProjects,
      load: { isLoading: false, error: null },
    });

    expect(result.current.selectedProjectId).toBeNull();
    expect(replace).toHaveBeenCalledWith("/workspace");
    expect(push).not.toHaveBeenCalled();
  });

  it("does not overwrite a new selection with a stale query", () => {
    setProjectParam("project-1");

    const { result, rerender } = renderHook(
      ({ projects, load }) => useOpenProject(projects, load),
      {
        initialProps: {
          projects: accessibleProjects,
          load: { isLoading: true, error: null as string | null },
        },
      },
    );

    rerender({
      projects: accessibleProjects,
      load: { isLoading: false, error: null },
    });

    expect(result.current.selectedProjectId).toBe("project-1");

    act(() => {
      result.current.selectProject("project-2");
    });

    rerender({
      projects: [...accessibleProjects],
      load: { isLoading: false, error: null },
    });

    expect(result.current.selectedProjectId).toBe("project-2");
  });

  it("does not clear a new selection when the query still has a missing id", () => {
    setProjectParam("gone-project");

    const { result, rerender } = renderHook(
      ({ projects, load }) => useOpenProject(projects, load),
      {
        initialProps: {
          projects: accessibleProjects,
          load: { isLoading: true, error: null as string | null },
        },
      },
    );

    act(() => {
      result.current.selectProject("project-2");
    });
    replace.mockClear();

    rerender({
      projects: accessibleProjects,
      load: { isLoading: false, error: null },
    });

    expect(result.current.selectedProjectId).toBe("project-2");
    expect(replace).not.toHaveBeenCalled();
  });

  it("does not clear the query before projects have started loading", () => {
    setProjectParam("project-1");

    const { result } = renderHook(() =>
      useOpenProject([], { isLoading: false, error: null }),
    );

    expect(result.current.selectedProjectId).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("does not clear the query when project load fails", () => {
    setProjectParam("project-1");

    const { rerender } = renderHook(
      ({ projects, load }) => useOpenProject(projects, load),
      {
        initialProps: {
          projects: [] as Array<{ id: string }>,
          load: { isLoading: true, error: null as string | null },
        },
      },
    );

    rerender({
      projects: [],
      load: { isLoading: false, error: "Failed to load projects" },
    });

    expect(replace).not.toHaveBeenCalled();
  });

  it("clears selection and the query when the open Project is closed", () => {
    const { result } = renderHook(() =>
      useOpenProject(accessibleProjects, { isLoading: false, error: null }),
    );

    act(() => {
      result.current.selectProject("project-1");
    });
    replace.mockClear();

    act(() => {
      result.current.clearOpenProject();
    });

    expect(result.current.selectedProjectId).toBeNull();
    expect(replace).toHaveBeenCalledWith("/workspace");
    expect(push).not.toHaveBeenCalled();
  });
});
