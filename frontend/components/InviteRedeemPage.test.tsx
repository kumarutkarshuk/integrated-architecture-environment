import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InviteRedeemPage } from "./InviteRedeemPage";

const { useAuth, useRedeemInvite, replace } = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRedeemInvite: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => useAuth(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("../hooks/useRedeemInvite", () => ({
  useRedeemInvite: (...args: unknown[]) => useRedeemInvite(...args),
}));

vi.mock("../lib/analytics", () => ({
  identifySignedInUser: vi.fn(),
  initSignedInAnalytics: vi.fn(),
}));

describe("InviteRedeemPage", () => {
  beforeEach(() => {
    useAuth.mockReset();
    useRedeemInvite.mockReset();
    replace.mockReset();
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
  });

  it("tells the User to sign in with the Invite email only on mismatch", () => {
    useRedeemInvite.mockReturnValue({
      isRedeeming: false,
      projectId: null,
      error: "Email does not match this Invite",
    });

    render(<InviteRedeemPage token="invite-token" />);

    expect(screen.getByText("Email does not match this Invite")).toBeTruthy();
    expect(
      screen.getByText("Sign in with the email this Invite was sent to."),
    ).toBeTruthy();
  });

  it("hides the sign-in hint for an old or expired Invite", () => {
    useRedeemInvite.mockReturnValue({
      isRedeeming: false,
      projectId: null,
      error: "This Invite is no longer valid",
    });

    render(<InviteRedeemPage token="old-token" />);

    expect(screen.getByText("This Invite is no longer valid")).toBeTruthy();
    expect(
      screen.queryByText("Sign in with the email this Invite was sent to."),
    ).toBeNull();
  });

  it("lands on the redeemed Project query after redeem", () => {
    useRedeemInvite.mockReturnValue({
      isRedeeming: false,
      projectId: "project-42",
      error: null,
    });

    render(<InviteRedeemPage token="invite-token" />);

    expect(replace).toHaveBeenCalledWith("/workspace?project=project-42");
  });

  it("sends a signed-out User to sign-in with the Invite path", () => {
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
    useRedeemInvite.mockReturnValue({
      isRedeeming: false,
      projectId: null,
      error: null,
    });

    render(<InviteRedeemPage token="invite-token" />);

    expect(replace).toHaveBeenCalledWith(
      "/sign-in?redirect_url=%2Finvite%2Finvite-token",
    );
  });
});
