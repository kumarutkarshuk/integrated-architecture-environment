import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useSidebarWidth,
  PROJECTS_SIDEBAR_WIDTH_STORAGE_KEY,
} from "./useSidebarWidth";

describe("useSidebarWidth", () => {
  beforeEach(() => {
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns default width when nothing is in localStorage", () => {
    const { result } = renderHook(() =>
      useSidebarWidth({
        storageKey: PROJECTS_SIDEBAR_WIDTH_STORAGE_KEY,
        defaultWidth: 260,
      }),
    );

    expect(result.current.width).toBe(260);
  });

  it("restores width preference from localStorage", () => {
    window.localStorage.setItem(PROJECTS_SIDEBAR_WIDTH_STORAGE_KEY, "320");

    const { result } = renderHook(() =>
      useSidebarWidth({
        storageKey: PROJECTS_SIDEBAR_WIDTH_STORAGE_KEY,
        defaultWidth: 260,
      }),
    );

    expect(result.current.width).toBe(320);
  });

  it("clamps custom width within min and max boundaries", () => {
    const { result } = renderHook(() =>
      useSidebarWidth({
        storageKey: PROJECTS_SIDEBAR_WIDTH_STORAGE_KEY,
        defaultWidth: 260,
        minWidth: 200,
        maxWidth: 500,
      }),
    );

    act(() => {
      result.current.setWidth(150);
    });
    expect(result.current.width).toBe(200);
    expect(
      window.localStorage.getItem(PROJECTS_SIDEBAR_WIDTH_STORAGE_KEY),
    ).toBe("200");

    act(() => {
      result.current.setWidth(800);
    });
    expect(result.current.width).toBe(500);
    expect(
      window.localStorage.getItem(PROJECTS_SIDEBAR_WIDTH_STORAGE_KEY),
    ).toBe("500");
  });

  it("resets to default width", () => {
    window.localStorage.setItem(PROJECTS_SIDEBAR_WIDTH_STORAGE_KEY, "340");
    const { result } = renderHook(() =>
      useSidebarWidth({
        storageKey: PROJECTS_SIDEBAR_WIDTH_STORAGE_KEY,
        defaultWidth: 260,
      }),
    );

    expect(result.current.width).toBe(340);

    act(() => {
      result.current.resetWidth();
    });

    expect(result.current.width).toBe(260);
    expect(
      window.localStorage.getItem(PROJECTS_SIDEBAR_WIDTH_STORAGE_KEY),
    ).toBe("260");
  });
});
