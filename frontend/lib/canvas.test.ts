import { describe, expect, it } from "vitest";
import { isLiveCanvasOnline } from "./canvas";

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
