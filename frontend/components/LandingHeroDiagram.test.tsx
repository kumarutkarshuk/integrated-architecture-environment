import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUsePrefersReducedMotion } = vi.hoisted(() => ({
  mockUsePrefersReducedMotion: vi.fn(),
}));

vi.mock("../hooks/usePrefersReducedMotion", () => ({
  usePrefersReducedMotion: () => mockUsePrefersReducedMotion(),
}));

describe("LandingHeroDiagram", () => {
  beforeEach(() => {
    mockUsePrefersReducedMotion.mockReset();
    mockUsePrefersReducedMotion.mockReturnValue(false);
  });

  it("renders architecture diagram nodes and flow elements in normal motion mode", async () => {
    const { LandingHeroDiagram } = await import("./LandingHeroDiagram");
    render(<LandingHeroDiagram />);

    expect(screen.getByText("Collaborative Clients")).toBeTruthy();
    expect(screen.getByText("API Gateway")).toBeTruthy();
    expect(screen.getByText("Real-Time Sync (Yjs CRDT)")).toBeTruthy();
    expect(screen.getByText("AI Generation Engine")).toBeTruthy();
    expect(screen.getByText("Canvas Snapshots (PostgreSQL)")).toBeTruthy();

    const container = screen.getByTestId("architecture-diagram-container");
    expect(container.getAttribute("data-reduced-motion")).toBe("false");
    expect(screen.getAllByTestId("motion-flow-indicator").length).toBeGreaterThan(0);
  });

  it("switches to smooth static non-vestibular visuals when user prefers reduced motion", async () => {
    mockUsePrefersReducedMotion.mockReturnValue(true);
    const { LandingHeroDiagram } = await import("./LandingHeroDiagram");
    render(<LandingHeroDiagram />);

    const container = screen.getByTestId("architecture-diagram-container");
    expect(container.getAttribute("data-reduced-motion")).toBe("true");
    expect(screen.queryAllByTestId("motion-flow-indicator").length).toBe(0);
    expect(screen.getAllByTestId("static-flow-indicator").length).toBeGreaterThan(0);
  });

  it("allows visitors to manually toggle reduced motion mode", async () => {
    mockUsePrefersReducedMotion.mockReturnValue(false);
    const { LandingHeroDiagram } = await import("./LandingHeroDiagram");
    render(<LandingHeroDiagram />);

    const toggleBtn = screen.getByRole("button", { name: /motion/i });
    expect(screen.getByTestId("architecture-diagram-container").getAttribute("data-reduced-motion")).toBe("false");

    fireEvent.click(toggleBtn);
    expect(screen.getByTestId("architecture-diagram-container").getAttribute("data-reduced-motion")).toBe("true");
    expect(screen.queryAllByTestId("motion-flow-indicator").length).toBe(0);
    expect(screen.getAllByTestId("static-flow-indicator").length).toBeGreaterThan(0);
  });
});
