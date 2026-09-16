import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSidebarOpen } from "./useSidebarOpen";

function stubLocalStorage() {
  const store = new Map<string, string>();

  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  });
}

describe("useSidebarOpen", () => {
  beforeEach(() => {
    stubLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts open when nothing is saved", () => {
    const { result } = renderHook(() =>
      useSidebarOpen("iae.sidebar.projects.open"),
    );

    expect(result.current.isOpen).toBe(true);
  });

  it("starts closed on a phone viewport when nothing is saved", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query.includes("min-width: 768px") ? false : true,
      })),
    );

    const { result } = renderHook(() =>
      useSidebarOpen("iae.sidebar.projects.open"),
    );

    await waitFor(() => {
      expect(result.current.isOpen).toBe(false);
    });
  });

  it("restores open and closed from the given key", async () => {
    window.localStorage.setItem("iae.sidebar.projects.open", "false");
    window.localStorage.setItem("iae.sidebar.ai.open", "true");

    const { result: projects } = renderHook(() =>
      useSidebarOpen("iae.sidebar.projects.open"),
    );
    const { result: ai } = renderHook(() =>
      useSidebarOpen("iae.sidebar.ai.open"),
    );

    await waitFor(() => {
      expect(projects.current.isOpen).toBe(false);
    });
    expect(ai.current.isOpen).toBe(true);
  });

  it("starts open when the saved value is not true or false", async () => {
    window.localStorage.setItem("iae.sidebar.projects.open", "maybe");

    const { result } = renderHook(() =>
      useSidebarOpen("iae.sidebar.projects.open"),
    );

    await waitFor(() => {
      expect(result.current.isOpen).toBe(true);
    });
  });

  it("writes the new open state to the given key", () => {
    const { result } = renderHook(() =>
      useSidebarOpen("iae.sidebar.projects.open"),
    );

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(false);
    expect(window.localStorage.getItem("iae.sidebar.projects.open")).toBe(
      "false",
    );

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(true);
    expect(window.localStorage.getItem("iae.sidebar.projects.open")).toBe(
      "true",
    );
  });

  it("toggles one sidebar without changing the other key", () => {
    const { result: projects } = renderHook(() =>
      useSidebarOpen("iae.sidebar.projects.open"),
    );
    const { result: ai } = renderHook(() =>
      useSidebarOpen("iae.sidebar.ai.open"),
    );

    act(() => {
      projects.current.toggle();
    });

    expect(projects.current.isOpen).toBe(false);
    expect(ai.current.isOpen).toBe(true);
    expect(window.localStorage.getItem("iae.sidebar.ai.open")).toBeNull();
  });

  it("writes an explicit open state to the given key", () => {
    const { result } = renderHook(() =>
      useSidebarOpen("iae.sidebar.ai.open"),
    );

    act(() => {
      result.current.setOpen(false);
    });

    expect(result.current.isOpen).toBe(false);
    expect(window.localStorage.getItem("iae.sidebar.ai.open")).toBe("false");

    act(() => {
      result.current.setOpen(true);
    });

    expect(result.current.isOpen).toBe(true);
    expect(window.localStorage.getItem("iae.sidebar.ai.open")).toBe("true");
  });
});
