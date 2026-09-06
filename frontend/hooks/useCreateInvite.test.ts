import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiProject, ApiUser } from "../lib/api";
import { useCreateInvite } from "./useCreateInvite";

const { getToken } = vi.hoisted(() => ({
  getToken: vi.fn(async () => "test-token"),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    createInvite: vi.fn(),
  };
});

import { createInvite } from "../lib/api";
import { toast } from "sonner";

const createInviteMock = vi.mocked(createInvite);
const toastErrorMock = vi.mocked(toast.error);

const owner: ApiUser = {
  id: "user-owner",
  email: "owner@example.com",
  displayName: "Owner",
};

function projectWith(ownerId: string): ApiProject {
  return {
    id: "project-1",
    name: "Shared Canvas",
    mode: "blank",
    status: "ready",
    createdAt: "2026-09-06T00:00:00.000Z",
    ownerId,
  };
}

describe("useCreateInvite", () => {
  beforeEach(() => {
    getToken.mockClear();
    getToken.mockResolvedValue("test-token");
    createInviteMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("allows the owner to send an Invite", async () => {
    createInviteMock.mockResolvedValue({
      id: "invite-1",
      email: "editor@example.com",
      role: "editor",
      expiresAt: "2026-09-13T00:00:00.000Z",
    });

    const { result } = renderHook(() =>
      useCreateInvite(projectWith("user-owner"), owner),
    );

    expect(result.current.canInvite).toBe(true);

    await act(async () => {
      await result.current.invite("editor@example.com");
    });

    expect(createInviteMock).toHaveBeenCalledWith(
      "test-token",
      "project-1",
      "editor@example.com",
    );
    expect(result.current.sentTo).toBe("editor@example.com");
  });

  it("hides Invite for a non-owner Collaborator", () => {
    const { result } = renderHook(() =>
      useCreateInvite(projectWith("someone-else"), owner),
    );

    expect(result.current.canInvite).toBe(false);
  });

  it("shows a toast when sending an Invite fails", async () => {
    createInviteMock.mockRejectedValueOnce(new Error("Failed to send Invite email"));

    const { result } = renderHook(() =>
      useCreateInvite(projectWith("user-owner"), owner),
    );

    await act(async () => {
      await result.current.invite("editor@example.com");
    });

    expect(result.current.sentTo).toBeNull();
    expect(toastErrorMock).toHaveBeenCalledWith("Failed to send Invite email");
  });
});
