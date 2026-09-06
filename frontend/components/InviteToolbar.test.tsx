import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { InviteToolbar } from "./InviteToolbar";

function renderToolbar(
  overrides: Partial<ComponentProps<typeof InviteToolbar>> = {},
) {
  const props: ComponentProps<typeof InviteToolbar> = {
    canInvite: true,
    isSending: false,
    sentTo: null,
    error: null,
    onInvite: () => undefined,
    ...overrides,
  };

  return render(<InviteToolbar {...props} />);
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

  it("sends an Invite to the typed email", () => {
    const onInvite = vi.fn();
    renderToolbar({ onInvite });

    act(() => {
      screen.getByRole("button", { name: "Invite" }).click();
    });

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Email"), {
      target: { value: "editor@example.com" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Send invite" }));

    expect(onInvite).toHaveBeenCalledWith("editor@example.com");
  });
});
