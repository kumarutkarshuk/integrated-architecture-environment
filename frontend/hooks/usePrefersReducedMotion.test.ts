import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

describe("usePrefersReducedMotion", () => {
  let listeners: Array<(event: { matches: boolean }) => void> = [];
  let matchesValue = false;

  beforeEach(() => {
    listeners = [];
    matchesValue = false;

    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("prefers-reduced-motion: reduce")
        ? matchesValue
        : false,
      media: query,
      onchange: null,
      addListener: (cb: (event: { matches: boolean }) => void) => {
        listeners.push(cb);
      },
      removeListener: (cb: (event: { matches: boolean }) => void) => {
        listeners = listeners.filter((l) => l !== cb);
      },
      addEventListener: (_type: string, cb: (event: { matches: boolean }) => void) => {
        listeners.push(cb);
      },
      removeEventListener: (_type: string, cb: (event: { matches: boolean }) => void) => {
        listeners = listeners.filter((l) => l !== cb);
      },
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when user does not prefer reduced motion", () => {
    matchesValue = false;
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it("returns true when user prefers reduced motion", () => {
    matchesValue = true;
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it("updates state when user preference changes", () => {
    matchesValue = false;
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      matchesValue = true;
      listeners.forEach((listener) => listener({ matches: true }));
    });

    expect(result.current).toBe(true);
  });
});
