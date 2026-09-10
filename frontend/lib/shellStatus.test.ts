import { describe, expect, it } from "vitest";
import {
  deriveWorkspaceShellStatus,
  presentShellStatus,
} from "./shellStatus";

describe("shellStatus", () => {
  it("shows idle on preview and generating while a project is not ready", () => {
    expect(
      presentShellStatus(
        deriveWorkspaceShellStatus({
          hasProject: true,
          projectReady: false,
          isGenerating: false,
          canvasActionsEnabled: false,
          saveStatus: "loading",
        }),
      ).label,
    ).toBe("Idle");

    expect(
      presentShellStatus(
        deriveWorkspaceShellStatus({
          hasProject: true,
          projectReady: false,
          isGenerating: true,
          canvasActionsEnabled: false,
          saveStatus: "loading",
        }),
      ).label,
    ).toBe("Idle");
  });

  it("uses the live label for the titlebar", () => {
    const status = deriveWorkspaceShellStatus({
      hasProject: true,
      projectReady: true,
      isGenerating: false,
      canvasActionsEnabled: true,
      saveStatus: "saved",
    });

    expect(presentShellStatus(status).label).toBe("CRDT Live");
  });

  it("shows disconnected instead of offline on the titlebar", () => {
    expect(
      presentShellStatus(
        deriveWorkspaceShellStatus({
          hasProject: true,
          projectReady: true,
          isGenerating: false,
          canvasActionsEnabled: false,
          saveStatus: "offline",
        }),
      ).label,
    ).toBe("Disconnected");
  });

  it("keeps the live label while the canvas is saving", () => {
    expect(
      presentShellStatus(
        deriveWorkspaceShellStatus({
          hasProject: true,
          projectReady: true,
          isGenerating: false,
          canvasActionsEnabled: true,
          saveStatus: "saving",
        }),
      ).label,
    ).toBe("CRDT Live");
  });
});
