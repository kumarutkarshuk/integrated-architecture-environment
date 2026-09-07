import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkspaceRoute from "../app/workspace/page";

const { useAuth, replace } = vi.hoisted(() => ({
  useAuth: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => useAuth(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("./WorkspaceShell", () => ({
  WorkspaceShell: () => <div>Workspace</div>,
}));

describe("the workspace gate", () => {
  beforeEach(() => {
    useAuth.mockReset();
    replace.mockReset();
  });

  it("sends a signed-out visitor to sign-in and back to the workspace", () => {
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });

    render(<WorkspaceRoute />);

    expect(replace).toHaveBeenCalledWith(
      "/sign-in?redirect_url=%2Fworkspace",
    );
    expect(screen.queryByText("Workspace")).toBeNull();
  });

  it("shows the workspace to a signed-in User", async () => {
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });

    render(<WorkspaceRoute />);

    expect(await screen.findByText("Workspace")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});
