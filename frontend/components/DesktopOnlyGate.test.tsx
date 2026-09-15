import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DesktopOnlyGate } from "./DesktopOnlyGate";

describe("DesktopOnlyGate", () => {
  it("tells mobile users the app is only for desktop browsers", () => {
    render(
      <DesktopOnlyGate>
        <p>Workspace</p>
      </DesktopOnlyGate>,
    );

    expect(screen.getByText("Only supported on desktop browsers.")).toBeTruthy();
    expect(screen.getByText("Workspace")).toBeTruthy();
  });
});
