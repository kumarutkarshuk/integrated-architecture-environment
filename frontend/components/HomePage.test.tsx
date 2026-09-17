import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

function stubMatchMedia(matchesFor: (query: string) => boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: matchesFor(query),
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

stubMatchMedia((query) => query.includes("min-width: 768px"));

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
  afterEach(() => {
    stubMatchMedia((query) => query.includes("min-width: 768px"));
  });

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
    expect(screen.getAllByText("WebMCP").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/AI agent/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("WebMCP local agent preview")).toBeDefined();
    expect(screen.getAllByText("You").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Agent").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Teammate").length).toBeGreaterThan(0);
    expect(screen.queryByText("Idle")).toBeNull();
    expect(screen.getAllByRole("link", { name: "GitHub" })).toHaveLength(1);
    expect(
      screen.getAllByRole("link", { name: "Developer's portfolio" }),
    ).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "GitHub" })[0].getAttribute("href")).toBe(
      "https://github.com/kumarutkarshuk/integrated-architecture-environment",
    );
    expect(
      screen.getAllByRole("link", { name: "Developer's portfolio" })[0].getAttribute("href"),
    ).toBe("https://utkarshkumar.vercel.app/");
    expect(initSignedInAnalytics).not.toHaveBeenCalled();
    expect(identifySignedInUser).not.toHaveBeenCalled();
  });

  it("opens the AI panel from the right activity bar", () => {
    render(<HomePage />);

    expect(screen.getByText("AI panel")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Collapse AI panel" }));
    expect(screen.queryByRole("button", { name: "Collapse AI panel" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "AI panel View" }));
    expect(screen.getByText("AI panel")).toBeDefined();
    expect(screen.getByLabelText("WebMCP local agent preview")).toBeDefined();
  });

  it("keeps the landing visible and closes the AI panel on a phone viewport", () => {
    stubMatchMedia((query) => query.includes("max-width: 767px"));

    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        name: /Integrated Architecture Environment/i,
      }),
    ).toBeDefined();
    expect(screen.getByRole("link", { name: /Open Workspace/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Collapse AI panel" })).toBeNull();
    expect(
      screen.getByText("For a better experience, use a desktop browser."),
    ).toBeDefined();
    expect(screen.queryByText("Only supported on desktop browsers.")).toBeNull();
    expect(screen.getAllByText("You").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Agent").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Teammate").length).toBeGreaterThan(0);
    expect(screen.getByText("API Gateway")).toBeDefined();
    expect(screen.getByText("Event Stream")).toBeDefined();
    expect(screen.getByText("Postgres")).toBeDefined();
  });
});
