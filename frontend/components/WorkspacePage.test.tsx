import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { identifySignedInUser, initSignedInAnalytics } from "../lib/analytics";
import { WorkspacePage } from "./WorkspacePage";

const { useAuth, replace } = vi.hoisted(() => ({
  useAuth: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
    push: vi.fn(),
  }),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => useAuth(),
}));

vi.mock("./WorkspaceShell", () => ({
  WorkspaceShell: () => <div>Mocked Workspace Shell</div>,
}));

vi.mock("../lib/analytics", () => ({
  identifySignedInUser: vi.fn(),
  initSignedInAnalytics: vi.fn(),
}));

describe("WorkspacePage", () => {
  beforeEach(() => {
    useAuth.mockReset();
    replace.mockReset();
    vi.mocked(identifySignedInUser).mockReset();
    vi.mocked(initSignedInAnalytics).mockReset();
    useAuth.mockReturnValue({
      isSignedIn: true,
      isLoaded: true,
      userId: "user_clerk_abc",
    });
  });

  it("renders workspace shell when signed in", () => {
    render(<WorkspacePage />);

    expect(screen.getByText("Mocked Workspace Shell")).toBeDefined();
  });

  it("identifies the signed-in User with their Clerk id", async () => {
    render(<WorkspacePage />);

    await waitFor(() => {
      expect(initSignedInAnalytics).toHaveBeenCalled();
      expect(identifySignedInUser).toHaveBeenCalledWith("user_clerk_abc");
    });
  });

  it("does not identify before Clerk has loaded", () => {
    useAuth.mockReturnValue({
      isSignedIn: false,
      isLoaded: false,
      userId: null,
    });

    render(<WorkspacePage />);

    expect(identifySignedInUser).not.toHaveBeenCalled();
  });
});
