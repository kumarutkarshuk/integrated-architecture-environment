import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CollapsibleSidebar } from "./CollapsibleSidebar";

describe("CollapsibleSidebar", () => {
  it("shows children and a collapse control when open", () => {
    render(
      <CollapsibleSidebar
        title="Projects"
        side="left"
        isOpen
        openWidthClass="w-64"
        onToggleOpen={() => undefined}
      >
        <p>Project list</p>
      </CollapsibleSidebar>,
    );

    expect(screen.getByText("Project list")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Collapse Projects" }),
    ).toBeTruthy();
  });

  it("renders nothing when collapsed", () => {
    render(
      <CollapsibleSidebar
        title="AI Assistant"
        side="right"
        isOpen={false}
        openWidthClass="w-72"
        onToggleOpen={() => undefined}
      >
        <p>AI panel</p>
      </CollapsibleSidebar>,
    );

    expect(screen.queryByText("AI panel")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Open AI Assistant" }),
    ).toBeNull();
  });

  it("collapses from its own header control", () => {
    const onToggleOpen = vi.fn();
    render(
      <CollapsibleSidebar
        title="Projects"
        side="left"
        isOpen
        openWidthClass="w-64"
        onToggleOpen={onToggleOpen}
      >
        <p>Project list</p>
      </CollapsibleSidebar>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Collapse Projects" }));
    expect(onToggleOpen).toHaveBeenCalledTimes(1);
  });

  it("collapses each sidebar on its own", () => {
    const toggleProjects = vi.fn();
    const toggleAi = vi.fn();

    render(
      <>
        <CollapsibleSidebar
          title="Projects"
          side="left"
          isOpen
          openWidthClass="w-64"
          onToggleOpen={toggleProjects}
        >
          <p>Project list</p>
        </CollapsibleSidebar>
        <CollapsibleSidebar
          title="AI Assistant"
          side="right"
          isOpen
          openWidthClass="w-72"
          onToggleOpen={toggleAi}
        >
          <p>AI panel</p>
        </CollapsibleSidebar>
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Collapse Projects" }));

    expect(toggleProjects).toHaveBeenCalledTimes(1);
    expect(toggleAi).not.toHaveBeenCalled();
    expect(screen.getByText("AI panel")).toBeTruthy();
  });

  it("keeps the collapse control visible and disabled when locked open", () => {
    const onToggleOpen = vi.fn();
    render(
      <CollapsibleSidebar
        title="AI Assistant"
        side="right"
        isOpen
        lockOpen
        openWidthClass="w-72"
        onToggleOpen={onToggleOpen}
      >
        <p>AI panel</p>
      </CollapsibleSidebar>,
    );

    const collapse = screen.getByRole("button", {
      name: "Collapse AI Assistant",
    });
    expect(collapse).toHaveProperty("disabled", true);

    fireEvent.click(collapse);
    expect(onToggleOpen).not.toHaveBeenCalled();
  });

});
