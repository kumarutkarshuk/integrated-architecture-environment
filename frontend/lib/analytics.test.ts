import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({
  __loaded: false,
  init: vi.fn(),
  identify: vi.fn(),
  capture: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: posthog,
}));

describe("signed-in product events", () => {
  beforeEach(() => {
    posthog.__loaded = false;
    posthog.init.mockReset();
    posthog.identify.mockReset();
    posthog.capture.mockReset();
    posthog.captureException.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("captures mcp_config_copied after PostHog loads", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { captureProductEvent, resetSignedInAnalytics } = await import(
      "./analytics"
    );
    resetSignedInAnalytics();

    captureProductEvent("mcp_config_copied", { client: "cursor" });

    await vi.waitFor(() => {
      expect(posthog.capture).toHaveBeenCalledWith("mcp_config_copied", {
        client: "cursor",
      });
    });
  });

  it("skips capture when PostHog is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    const { captureProductEvent, resetSignedInAnalytics } = await import(
      "./analytics"
    );
    resetSignedInAnalytics();

    captureProductEvent("webmcp_tool_used", { tool: "read_canvas_state", ok: true });
    await Promise.resolve();

    expect(posthog.capture).not.toHaveBeenCalled();
  });
});
