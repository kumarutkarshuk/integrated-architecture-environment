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

import { identifySignedInUser, initSignedInAnalytics } from "../lib/analytics";
import { HomePage } from "./HomePage";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    isSignedIn: false,
    isLoaded: true,
  }),
  UserButton: () => <div>Account</div>,
}));

vi.mock("../lib/analytics", () => ({
  identifySignedInUser: vi.fn(),
  initSignedInAnalytics: vi.fn(),
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
    ).toBeGreaterThan(0);

    expect(screen.getByLabelText("Overview")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "AI panel View" }),
    ).toBeDefined();
    expect(screen.getByText("AI panel")).toBeDefined();
    expect(screen.queryByText("Idle")).toBeNull();
    expect(screen.getAllByRole("link", { name: "GitHub" })).toHaveLength(2);
    expect(
      screen.getAllByRole("link", { name: "Utkarsh Kumar" }),
    ).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "GitHub" })[0].getAttribute("href")).toBe(
      "https://github.com/kumarutkarshuk/integrated-architecture-environment",
    );
    expect(
      screen.getAllByRole("link", { name: "Utkarsh Kumar" })[0].getAttribute("href"),
    ).toBe("https://utkarshkumar.vercel.app/");
    expect(initSignedInAnalytics).not.toHaveBeenCalled();
    expect(identifySignedInUser).not.toHaveBeenCalled();
  });

  it("opens the AI panel from the right activity bar", () => {
    render(<HomePage />);

    expect(screen.getByText("AI panel")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Collapse AI panel" }));
    expect(screen.queryByText("AI panel")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "AI panel View" }));
    expect(screen.getByText("AI panel")).toBeDefined();
    expect(screen.getByLabelText("AI chat preview")).toBeDefined();
  });
});
