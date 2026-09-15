import { describe, expect, it } from "vitest";
import {
  CANVAS_WS_RECONNECT_MAX_MS,
  getCanvasWsReconnectDelayMs,
  isLiveCanvasOnline,
  normalizeCanvasRecords,
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

describe("normalizeCanvasRecords", () => {
  it("repairs invalid tldraw shape indexes like ba", () => {
    const records = normalizeCanvasRecords({
      "shape:box": {
        id: "shape:box",
        typeName: "shape",
        type: "geo",
        index: "a1",
        parentId: "page:page",
      },
      "shape:arrow": {
        id: "shape:arrow",
        typeName: "shape",
        type: "arrow",
        index: "ba",
        parentId: "page:page",
      },
    });

    expect(records["shape:box"]).toMatchObject({ index: "a1" });
    expect(records["shape:arrow"]).toMatchObject({ index: "a2" });
  });
});
