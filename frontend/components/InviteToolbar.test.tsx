import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { InviteToolbar } from "./InviteToolbar";

function renderToolbar(
  overrides: Partial<ComponentProps<typeof InviteToolbar>> = {},
) {
  const props: ComponentProps<typeof InviteToolbar> = {
    canInvite: true,
    actionsEnabled: true,
    isSending: false,
    currentUserEmail: "owner@example.com",
    collaborators: [],
    isLoadingCollaborators: false,
    resendingInviteId: null,
    onOpen: () => undefined,
    onInvite: () => undefined,
    onResend: () => undefined,
    ...overrides,
  };

  return render(<InviteToolbar {...props} />);
}

function openDialog() {
  act(() => {
    screen.getByRole("button", { name: "Invite" }).click();
  });
  return screen.getByRole("dialog");
}

describe("InviteToolbar", () => {
  it("shows Invite for the Project owner", () => {
    renderToolbar();
    expect(screen.getByRole("button", { name: "Invite" })).toBeTruthy();
  });

  it("hides Invite when the User is not the owner", () => {
    renderToolbar({ canInvite: false });
    expect(screen.queryByRole("button", { name: "Invite" })).toBeNull();
  });

  it("disables Invite until the live canvas is connected", () => {
    renderToolbar({ actionsEnabled: false });
    expect(
      (screen.getByRole("button", { name: "Invite" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("loads Collaborators when the dialog opens", () => {
    const onOpen = vi.fn();
    renderToolbar({ onOpen });

    openDialog();

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("sends an Invite to the typed email", () => {
    const onInvite = vi.fn();
    renderToolbar({ onInvite });

    const dialog = openDialog();
    fireEvent.change(within(dialog).getByLabelText("Email"), {
      target: { value: "editor@example.com" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Send invite" }));

    expect(onInvite).toHaveBeenCalledWith("editor@example.com");
  });

  it("shows Collaborators with joining status and a Resend button", () => {
    const onResend = vi.fn();
    renderToolbar({
      onResend,
      collaborators: [
        {
          email: "owner@example.com",
          displayName: "Owner",
          role: "owner",
          status: "joined",
        },
        {
          email: "pending@example.com",
          displayName: null,
          role: "editor",
          status: "pending",
          inviteId: "invite-1",
          sendCount: 1,
          canResend: true,
          resendAvailableAt: null,
        },
      ],
    });

    const dialog = openDialog();
    expect(within(dialog).getByText("Owner (you)")).toBeTruthy();
    expect(within(dialog).getByText("owner@example.com · Joined · Owner · You")).toBeTruthy();
    expect(within(dialog).getByText("Pending")).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Resend" }));
    expect(onResend).toHaveBeenCalledWith("invite-1");
  });

  it("marks the current User in the Collaborators list", () => {
    renderToolbar({
      currentUserEmail: "Ada@example.com",
      collaborators: [
        {
          email: "ada@example.com",
          displayName: "Ada",
          role: "owner",
          status: "joined",
        },
        {
          email: "editor@example.com",
          displayName: "Lin",
          role: "editor",
          status: "joined",
        },
      ],
    });

    const dialog = openDialog();
    expect(within(dialog).getByText("Ada (you)")).toBeTruthy();
    expect(within(dialog).getByText("Lin")).toBeTruthy();
    expect(within(dialog).queryByText("Lin (you)")).toBeNull();
  });

  it("hides Resend when the send limit is reached", () => {
    renderToolbar({
      collaborators: [
        {
          email: "pending@example.com",
          displayName: null,
          role: "editor",
          status: "pending",
          inviteId: "invite-1",
          sendCount: 3,
          canResend: false,
          resendAvailableAt: null,
        },
      ],
    });

    const dialog = openDialog();
    expect(within(dialog).queryByRole("button", { name: "Resend" })).toBeNull();
    expect(within(dialog).getByText("Resend limit reached")).toBeTruthy();
  });

  it("hides Resend until 5 minutes have passed", () => {
    renderToolbar({
      collaborators: [
        {
          email: "pending@example.com",
          displayName: null,
          role: "editor",
          status: "pending",
          inviteId: "invite-1",
          sendCount: 1,
          canResend: false,
          resendAvailableAt: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
        },
      ],
    });

    const dialog = openDialog();
    expect(within(dialog).queryByRole("button", { name: "Resend" })).toBeNull();
    expect(within(dialog).getByText(/Resend in 4 min/)).toBeTruthy();
  });
});
