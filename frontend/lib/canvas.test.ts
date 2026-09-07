import { describe, expect, it } from "vitest";
import {
  CANVAS_WS_RECONNECT_MAX_MS,
  getCanvasWsReconnectDelayMs,
  isLiveCanvasOnline,
} from "./canvas";

describe("isLiveCanvasOnline", () => {
  it("is true when the live canvas is synced and online", () => {
    expect(
      isLiveCanvasOnline(
        { status: "synced-remote", connectionStatus: "online" },
        "saved",
      ),
    ).toBe(true);
  });

  it("is false while the canvas is loading or offline", () => {
    expect(isLiveCanvasOnline({ status: "loading" }, "loading")).toBe(false);
    expect(
      isLiveCanvasOnline(
        { status: "synced-remote", connectionStatus: "offline" },
        "offline",
      ),
    ).toBe(false);
  });
});

describe("getCanvasWsReconnectDelayMs", () => {
  it("uses exponential backoff capped at the max delay", () => {
    expect(getCanvasWsReconnectDelayMs(1)).toBe(200);
    expect(getCanvasWsReconnectDelayMs(2)).toBe(400);
    expect(getCanvasWsReconnectDelayMs(3)).toBe(800);
    expect(getCanvasWsReconnectDelayMs(10)).toBe(CANVAS_WS_RECONNECT_MAX_MS);
  });
});
