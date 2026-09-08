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
  it("renders the studio chrome, hero, and workspace actions", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        name: /Integrated Architecture Environment/i,
      }),
    ).toBeDefined();

    expect(
      screen.getAllByRole("link", { name: /Open Workspace/i }).length,
    ).toBeGreaterThan(1);

    expect(screen.getByLabelText("Overview")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "AI Assistant View" }),
    ).toBeDefined();
    expect(screen.queryByText("AI Assistant")).toBeNull();
    expect(screen.getAllByText("Idle").length).toBeGreaterThan(1);
  });

  it("opens the AI assistant from the right activity bar", () => {
    render(<HomePage />);

    expect(screen.queryByText("AI Assistant")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "AI Assistant View" }));
    expect(screen.getByText("AI Assistant")).toBeDefined();
    expect(screen.getByText("AI topology")).toBeDefined();
  });
});
