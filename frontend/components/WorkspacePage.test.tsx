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

vi.mock("./WorkspaceShell", () => ({
  WorkspaceShell: () => <div data-testid="workspace-shell">Live Workspace Shell</div>,
}));

describe("WorkspacePage", () => {
  beforeEach(() => {
    useAuth.mockReset();
    replace.mockReset();
    searchParamsGet.mockReset();
  });

  it("shows loading indicator when auth is not loaded", async () => {
    useAuth.mockReturnValue({ isLoaded: false, isSignedIn: false });
    const { WorkspacePage } = await import("./WorkspacePage");
    render(<WorkspacePage />);

    expect(screen.getByText("Loading workspace...")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated visitor to sign in with /workspace redirect", async () => {
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
    searchParamsGet.mockReturnValue(null);
    const { WorkspacePage } = await import("./WorkspacePage");
    render(<WorkspacePage />);

    expect(replace).toHaveBeenCalledWith(
      `/sign-in?redirect_url=${encodeURIComponent("/workspace")}`,
    );
  });

  it("preserves project query in sign-in redirect when unauthenticated visitor opens specific project", async () => {
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
    searchParamsGet.mockImplementation((key: string) =>
      key === "project" ? "project-99" : null,
    );
    const { WorkspacePage } = await import("./WorkspacePage");
    render(<WorkspacePage />);

    expect(replace).toHaveBeenCalledWith(
      `/sign-in?redirect_url=${encodeURIComponent("/workspace?project=project-99")}`,
    );
  });

  it("renders WorkspaceShell when visitor is authenticated", async () => {
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    const { WorkspacePage } = await import("./WorkspacePage");
    render(<WorkspacePage />);

    expect(screen.getByTestId("workspace-shell")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});
