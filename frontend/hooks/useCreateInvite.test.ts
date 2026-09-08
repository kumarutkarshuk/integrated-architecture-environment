import { act, renderHook, waitFor } from "@testing-library/react";
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
    fetchCollaborators: vi.fn(),
    resendInvite: vi.fn(),
  };
});

import {
  createInvite,
  fetchCollaborators,
  resendInvite,
} from "../lib/api";
import { toast } from "sonner";

const createInviteMock = vi.mocked(createInvite);
const fetchCollaboratorsMock = vi.mocked(fetchCollaborators);
const resendInviteMock = vi.mocked(resendInvite);
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
    fetchCollaboratorsMock.mockReset();
    resendInviteMock.mockReset();
    toastErrorMock.mockReset();
    fetchCollaboratorsMock.mockResolvedValue([
      {
        email: "owner@example.com",
        displayName: "Owner",
        role: "owner",
        status: "joined",
      },
    ]);
  });

  it("loads Collaborators when a Project is selected", async () => {
    const { result } = renderHook(() =>
      useCreateInvite(projectWith("user-owner"), owner),
    );

    await waitFor(() => {
      expect(fetchCollaboratorsMock).toHaveBeenCalledWith(
        "test-token",
        "project-1",
      );
    });
    await waitFor(() => {
      expect(result.current.joinedCount).toBe(1);
    });
    expect(result.current.canInvite).toBe(true);
  });

  it("counts joined Collaborators including the current User", async () => {
    fetchCollaboratorsMock.mockResolvedValue([
      {
        email: "owner@example.com",
        displayName: "Owner",
        role: "owner",
        status: "joined",
      },
      {
        email: "editor@example.com",
        displayName: "Editor",
        role: "editor",
        status: "joined",
      },
    ]);

    const editor: ApiUser = {
      id: "user-editor",
      email: "editor@example.com",
      displayName: "Editor",
    };

    const { result } = renderHook(() =>
      useCreateInvite(projectWith("user-owner"), editor),
    );

    expect(result.current.canInvite).toBe(false);

    await waitFor(() => {
      expect(fetchCollaboratorsMock).toHaveBeenCalledWith(
        "test-token",
        "project-1",
      );
    });
    await waitFor(() => {
      expect(result.current.joinedCount).toBe(2);
    });
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
      await result.current.loadCollaborators();
    });

    await act(async () => {
      await result.current.invite("editor@example.com");
    });

    expect(createInviteMock).toHaveBeenCalledWith(
      "test-token",
      "project-1",
      "editor@example.com",
    );
    expect(fetchCollaboratorsMock).toHaveBeenCalledTimes(3);
  });

  it("resends a pending Invite", async () => {
    resendInviteMock.mockResolvedValue({
      id: "invite-1",
      email: "pending@example.com",
      role: "editor",
      expiresAt: "2026-09-13T00:00:00.000Z",
    });

    const { result } = renderHook(() =>
      useCreateInvite(projectWith("user-owner"), owner),
    );

    await act(async () => {
      await result.current.resend("invite-1");
    });

    expect(resendInviteMock).toHaveBeenCalledWith(
      "test-token",
      "project-1",
      "invite-1",
    );
    expect(fetchCollaboratorsMock).toHaveBeenCalledTimes(2);
  });

  it("hides Invite for a non-owner Collaborator", async () => {
    const { result } = renderHook(() =>
      useCreateInvite(projectWith("someone-else"), owner),
    );

    expect(result.current.canInvite).toBe(false);
    await waitFor(() => {
      expect(fetchCollaboratorsMock).toHaveBeenCalled();
    });
  });

  it("shows a toast when sending an Invite fails", async () => {
    createInviteMock.mockRejectedValueOnce(new Error("Failed to send Invite email"));

    const { result } = renderHook(() =>
      useCreateInvite(projectWith("user-owner"), owner),
    );

    await act(async () => {
      await result.current.invite("editor@example.com");
    });

    expect(toastErrorMock).toHaveBeenCalledWith("Failed to send Invite email");
  });
});
