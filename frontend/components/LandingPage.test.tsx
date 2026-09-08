import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useAuth, replace, searchParamsGet } = vi.hoisted(() => ({
  useAuth: vi.fn(),
  replace: vi.fn(),
  searchParamsGet: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => useAuth(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => ({
    get: (key: string) => searchParamsGet(key),
  }),
}));

describe("LandingPage", () => {
  beforeEach(() => {
    useAuth.mockReset();
    replace.mockReset();
    searchParamsGet.mockReset();
  });

  it("renders public product value messaging, visitor links, and CTA buttons for unauthenticated visitors", async () => {
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
    searchParamsGet.mockReturnValue(null);

    const { LandingPage } = await import("./LandingPage");
    render(<LandingPage />);

    // Value messaging
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(
      screen.getByText(/Design, iterate, and export system architecture/i),
    ).toBeTruthy();

    // Call to action buttons & visitor links
    const openWorkspaceLinks = screen.getAllByRole("link", {
      name: /open workspace/i,
    });
    expect(openWorkspaceLinks.length).toBeGreaterThan(0);
    expect(openWorkspaceLinks[0].getAttribute("href")).toBe("/workspace");

    const signInLinks = screen.getAllByRole("link", {
      name: /sign in/i,
    });
    expect(signInLinks.length).toBeGreaterThan(0);
    expect(signInLinks[0].getAttribute("href")).toBe(
      `/sign-in?redirect_url=${encodeURIComponent("/workspace")}`,
    );

    const signUpLinks = screen.getAllByRole("link", {
      name: /get started/i,
    });
    expect(signUpLinks.length).toBeGreaterThan(0);
    expect(signUpLinks[0].getAttribute("href")).toBe(
      `/sign-up?redirect_url=${encodeURIComponent("/workspace")}`,
    );

    // Diagram visual is present
    expect(screen.getByTestId("architecture-diagram-container")).toBeTruthy();
  });

  it("redirects authenticated visitors directly to the workspace route", async () => {
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    searchParamsGet.mockReturnValue(null);

    const { LandingPage } = await import("./LandingPage");
    render(<LandingPage />);

    expect(replace).toHaveBeenCalledWith("/workspace");
  });

  it("redirects authenticated visitors directly to the invited or target project in workspace", async () => {
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    searchParamsGet.mockImplementation((key: string) =>
      key === "project" ? "project-789" : null,
    );

    const { LandingPage } = await import("./LandingPage");
    render(<LandingPage />);

    expect(replace).toHaveBeenCalledWith("/workspace?project=project-789");
  });
});
