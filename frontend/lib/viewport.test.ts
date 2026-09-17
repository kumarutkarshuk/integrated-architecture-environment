import { afterEach, describe, expect, it, vi } from "vitest";
import { isDesktopViewport } from "./viewport";

describe("isDesktopViewport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("treats a missing matchMedia as desktop", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(isDesktopViewport()).toBe(true);
  });

  it("follows the desktop media query", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query.includes("min-width: 768px"),
      })),
    );

    expect(isDesktopViewport()).toBe(true);
  });
});
