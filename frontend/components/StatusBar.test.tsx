import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBar } from "./StatusBar";

describe("StatusBar", () => {
  it("renders with 22px height (h-5.5) and status landmark", () => {
    const { container } = render(
      <StatusBar
        saveStatus="saved"
        connectionHealth="online"
        collaboratorCount={1}
        projectName="Test Project"
        mode="canvas"
      />,
    );

    const footer = container.querySelector("footer");
    expect(footer?.classList.contains("h-5.5")).toBe(true);
    expect(screen.getByRole("status", { name: "Status Bar" })).toBeTruthy();
  });

  it("displays live canvas save state variations correctly", () => {
    const { rerender } = render(
      <StatusBar
        saveStatus="saved"
        connectionHealth="online"
        collaboratorCount={1}
        projectName="Test Project"
        mode="canvas"
      />,
    );

    expect(screen.getByTestId("status-bar-save").textContent).toContain("Saved");

    rerender(
      <StatusBar
        saveStatus="saving"
        connectionHealth="online"
        collaboratorCount={1}
        projectName="Test Project"
        mode="canvas"
      />,
    );
    expect(screen.getByTestId("status-bar-save").textContent).toContain("Saving...");

    rerender(
      <StatusBar
        saveStatus="offline"
        connectionHealth="offline"
        collaboratorCount={1}
        projectName="Test Project"
        mode="canvas"
      />,
    );
    expect(screen.getByTestId("status-bar-save").textContent).toContain("Offline");

    rerender(
      <StatusBar
        saveStatus="error"
        connectionHealth="offline"
        collaboratorCount={1}
        projectName="Test Project"
        mode="canvas"
      />,
    );
    expect(screen.getByTestId("status-bar-save").textContent).toContain(
      "Save unavailable",
    );
  });

  it("displays connection health accurately", () => {
    const { rerender } = render(
      <StatusBar
        saveStatus="saved"
        connectionHealth="online"
        collaboratorCount={1}
        mode="canvas"
      />,
    );

    expect(screen.getByTestId("status-bar-connection").textContent).toContain(
      "Connected",
    );

    rerender(
      <StatusBar
        saveStatus="loading"
        connectionHealth="connecting"
        collaboratorCount={1}
        mode="canvas"
      />,
    );
    expect(screen.getByTestId("status-bar-connection").textContent).toContain(
      "Connecting...",
    );

    rerender(
      <StatusBar
        saveStatus="offline"
        connectionHealth="offline"
        collaboratorCount={1}
        mode="canvas"
      />,
    );
    expect(screen.getByTestId("status-bar-connection").textContent).toContain(
      "Offline",
    );
  });

  it("displays current online collaborator count", () => {
    const { rerender } = render(
      <StatusBar
        saveStatus="saved"
        connectionHealth="online"
        collaboratorCount={1}
        mode="canvas"
      />,
    );

    expect(screen.getByTestId("status-bar-collaborators").textContent).toContain(
      "1 collaborator online",
    );

    rerender(
      <StatusBar
        saveStatus="saved"
        connectionHealth="online"
        collaboratorCount={3}
        mode="canvas"
      />,
    );
    expect(screen.getByTestId("status-bar-collaborators").textContent).toContain(
      "3 collaborators online",
    );
  });
});
