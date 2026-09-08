import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActivityBar } from "./ActivityBar";

describe("ActivityBar", () => {
  it("renders with 48px width (w-12) and accessible navigation landmarks", () => {
    const { container } = render(
      <ActivityBar
        isProjectsOpen={true}
        isAiOpen={false}
        onToggleProjects={() => undefined}
        onToggleAi={() => undefined}
      />,
    );

    const nav = container.querySelector("nav");
    expect(nav?.classList.contains("w-12")).toBe(true);
    expect(screen.getByRole("navigation", { name: "Activity Bar" })).toBeTruthy();
  });

  it("toggles side panels on click and highlights active selections", () => {
    const onToggleProjects = vi.fn();
    const onToggleAi = vi.fn();

    const { rerender } = render(
      <ActivityBar
        isProjectsOpen={true}
        isAiOpen={false}
        onToggleProjects={onToggleProjects}
        onToggleAi={onToggleAi}
      />,
    );

    const explorerButton = screen.getByRole("button", { name: "Explorer" });
    const aiButton = screen.getByRole("button", { name: "AI Assistant" });

    expect(explorerButton.getAttribute("aria-pressed")).toBe("true");
    expect(explorerButton.className).toContain("border-white");
    expect(aiButton.getAttribute("aria-pressed")).toBe("false");
    expect(aiButton.className).toContain("border-transparent");

    fireEvent.click(explorerButton);
    expect(onToggleProjects).toHaveBeenCalledTimes(1);

    fireEvent.click(aiButton);
    expect(onToggleAi).toHaveBeenCalledTimes(1);

    rerender(
      <ActivityBar
        isProjectsOpen={false}
        isAiOpen={true}
        onToggleProjects={onToggleProjects}
        onToggleAi={onToggleAi}
      />,
    );

    expect(explorerButton.getAttribute("aria-pressed")).toBe("false");
    expect(aiButton.getAttribute("aria-pressed")).toBe("true");
    expect(aiButton.className).toContain("border-purple-400");
  });

  it("exposes explorer tools with tooltips and triggers actions", () => {
    const onNewProject = vi.fn();
    const onExportSpec = vi.fn();

    render(
      <ActivityBar
        isProjectsOpen={false}
        isAiOpen={false}
        onToggleProjects={() => undefined}
        onToggleAi={() => undefined}
        onNewProject={onNewProject}
        onExportSpec={onExportSpec}
        canExportSpec={true}
      />,
    );

    const newProjectBtn = screen.getByRole("button", { name: "New Project" });
    expect(newProjectBtn.getAttribute("title")).toBe("New Project");

    fireEvent.click(newProjectBtn);
    expect(onNewProject).toHaveBeenCalledTimes(1);

    const exportSpecBtn = screen.getByRole("button", {
      name: "Export Architecture Spec",
    });
    expect(exportSpecBtn.getAttribute("title")).toBe("Export Architecture Spec");

    fireEvent.click(exportSpecBtn);
    expect(onExportSpec).toHaveBeenCalledTimes(1);
  });
});
