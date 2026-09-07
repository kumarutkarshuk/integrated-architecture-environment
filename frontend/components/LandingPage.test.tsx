import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LandingRoute from "../app/page";

const { useAuth, replace, push } = vi.hoisted(() => ({
  useAuth: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => useAuth(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
}));

describe("the public landing page", () => {
  beforeEach(() => {
    useAuth.mockReset();
    replace.mockReset();
    push.mockReset();
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
  });

  it("shows a signed-out visitor the page instead of sending them to sign-in", () => {
    render(<LandingRoute />);

    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("points the primary action at the workspace", () => {
    render(<LandingRoute />);

    expect(
      screen.getByRole("link", { name: "Start designing" }).getAttribute("href"),
    ).toBe("/workspace");
  });

  it("offers sign-in and sign-up to a signed-out visitor", () => {
    render(<LandingRoute />);

    expect(
      screen.getByRole("link", { name: "Sign in" }).getAttribute("href"),
    ).toBe("/sign-in");
    expect(
      screen.getByRole("link", { name: "Sign up" }).getAttribute("href"),
    ).toBe("/sign-up");
  });

  it("offers a signed-in User the workspace rather than sign-in", () => {
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });

    render(<LandingRoute />);

    expect(
      screen
        .getByRole("link", { name: "Open workspace" })
        .getAttribute("href"),
    ).toBe("/workspace");
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Start designing" })).toBeNull();
  });

  it("labels the Prompt Project and Spec export showcases as AI", () => {
    render(<LandingRoute />);

    const promptProject = screen.getByRole("region", { name: "Prompt Project" });
    const specExport = screen.getByRole("region", { name: "Spec export" });

    expect(within(promptProject).getByText("AI")).toBeTruthy();
    expect(within(specExport).getByText("AI")).toBeTruthy();
  });

  it("names the Collaborators moving on the collaboration showcase", () => {
    render(<LandingRoute />);

    const collaboration = screen.getByRole("region", {
      name: "Live collaboration",
    });

    expect(within(collaboration).getByText("Ada")).toBeTruthy();
    expect(within(collaboration).getByText("Grace")).toBeTruthy();
  });

  it("shows the Spec demo's gaps summary", () => {
    render(<LandingRoute />);

    const specExport = screen.getByRole("region", { name: "Spec export" });

    expect(within(specExport).getByText(/Gaps/)).toBeTruthy();
  });
});
