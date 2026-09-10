import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkspacePage } from "./WorkspacePage";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    isSignedIn: true,
    isLoaded: true,
  }),
}));

vi.mock("./WorkspaceShell", () => ({
  WorkspaceShell: () => <div>Mocked Workspace Shell</div>,
}));

describe("WorkspacePage", () => {
  it("renders workspace shell when signed in", () => {
    render(<WorkspacePage />);

    expect(screen.getByText("Mocked Workspace Shell")).toBeDefined();
  });
});
