import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRedeemInvite } from "./useRedeemInvite";

const { getToken } = vi.hoisted(() => ({
  getToken: vi.fn(async () => "test-token"),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken }),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    redeemInvite: vi.fn(),
  };
});

import { redeemInvite } from "../lib/api";

const redeemInviteMock = vi.mocked(redeemInvite);

async function flushEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useRedeemInvite", () => {
  beforeEach(() => {
    getToken.mockClear();
    getToken.mockResolvedValue("test-token");
    redeemInviteMock.mockReset();
  });

  it("redeems a matching Invite and returns the Project id", async () => {
    redeemInviteMock.mockResolvedValue({ projectId: "project-1" });

    const { result } = renderHook(() =>
      useRedeemInvite("invite-token", true),
    );

    await flushEffects();

    expect(redeemInviteMock).toHaveBeenCalledWith("test-token", "invite-token");
    expect(result.current.projectId).toBe("project-1");
    expect(result.current.error).toBeNull();
    expect(result.current.isRedeeming).toBe(false);
  });

  it("surfaces an error when Clerk email does not match the Invite", async () => {
    redeemInviteMock.mockRejectedValue(
      new Error("Email does not match this Invite"),
    );

    const { result } = renderHook(() =>
      useRedeemInvite("invite-token", true),
    );

    await flushEffects();

    expect(result.current.projectId).toBeNull();
    expect(result.current.error).toBe("Email does not match this Invite");
  });

  it("does not redeem until the recipient is signed in", async () => {
    const { result } = renderHook(() =>
      useRedeemInvite("invite-token", false),
    );

    await flushEffects();

    expect(redeemInviteMock).not.toHaveBeenCalled();
    expect(result.current.projectId).toBeNull();
    expect(result.current.isRedeeming).toBe(false);
  });
});
