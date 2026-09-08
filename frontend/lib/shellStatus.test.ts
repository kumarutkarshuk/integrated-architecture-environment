import { describe, expect, it } from "vitest";
import {
  deriveWorkspaceShellStatus,
  presentShellStatus,
} from "./shellStatus";

describe("shellStatus", () => {
  it("shows preview instead of idle while a project is generating or previewing", () => {
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
    ).toBe("Preview");

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
    ).toBe("Generating");
  });

  it("uses the same live label for the titlebar and status bar", () => {
    const status = deriveWorkspaceShellStatus({
      hasProject: true,
      projectReady: true,
      isGenerating: false,
      canvasActionsEnabled: true,
      saveStatus: "saved",
    });

    expect(presentShellStatus(status).label).toBe("CRDT Live");
  });
});
