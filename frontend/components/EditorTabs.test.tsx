import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorTabs } from "./EditorTabs";

describe("EditorTabs", () => {
  it("renders with distinct styling and status indicators for live canvas and AI proposal preview", () => {
    const { rerender } = render(
      <EditorTabs
        activeTab="canvas"
        onSelectTab={() => undefined}
        isProjectReady={true}
        projectName="Payment service"
      />,
    );

    const canvasTab = screen.getByRole("tab", { name: "Live Canvas Tab" });
    const previewTab = screen.getByRole("tab", { name: "AI Preview Tab" });

    expect(canvasTab.getAttribute("aria-selected")).toBe("true");
    expect(canvasTab.className).toContain("border-t-accent");
    expect(screen.getByText("Live")).toBeTruthy();

    expect(previewTab.getAttribute("aria-selected")).toBe("false");
    expect(previewTab.className).toContain("border-t-transparent");
    expect(screen.getByText("AI Proposal")).toBeTruthy();

    rerender(
      <EditorTabs
        activeTab="preview"
        onSelectTab={() => undefined}
        isProjectReady={false}
        projectName="Payment service"
      />,
    );

    expect(canvasTab.getAttribute("aria-selected")).toBe("false");
    expect(screen.getByText("Locked")).toBeTruthy();

    expect(previewTab.getAttribute("aria-selected")).toBe("true");
    expect(previewTab.className).toContain("border-t-purple-500");
  });

  it("calls onSelectTab when tabs are clicked", () => {
    const onSelectTab = vi.fn();

    render(
      <EditorTabs
        activeTab="canvas"
        onSelectTab={onSelectTab}
        isProjectReady={true}
        projectName="Payment service"
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "AI Preview Tab" }));
    expect(onSelectTab).toHaveBeenCalledWith("preview");

    fireEvent.click(screen.getByRole("tab", { name: "Live Canvas Tab" }));
    expect(onSelectTab).toHaveBeenCalledWith("canvas");
  });
});
