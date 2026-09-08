import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

import { HomePage } from "./HomePage";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    isSignedIn: false,
    isLoaded: true,
  }),
  UserButton: () => <div>Account</div>,
}));

describe("HomePage", () => {
  it("renders the studio chrome, hero, and workspace action", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        name: /Design systems at editor speed/i,
      }),
    ).toBeDefined();

    expect(
      screen.getAllByRole("link", { name: /Open Workspace/i }).length,
    ).toBeGreaterThan(0);

    expect(screen.getByRole("button", { name: "Overview" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Workflow" })).toBeDefined();
  });

  it("opens the workflow pane from the activity bar", () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: "Workflow" }));

    expect(screen.getByRole("heading", { name: "Prompt" })).toBeDefined();
    expect(screen.getAllByText("workflow.md").length).toBeGreaterThan(0);
  });
});
