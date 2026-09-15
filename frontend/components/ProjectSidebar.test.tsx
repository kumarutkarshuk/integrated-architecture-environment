import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiProject } from "../lib/api";
import { ProjectSidebar } from "./ProjectSidebar";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { toast } from "sonner";

const ownedProject: ApiProject = {
  id: "project-owned",
  name: "Owned Canvas",
  mode: "blank",
  status: "ready",
  createdAt: "2026-09-06T00:00:00.000Z",
  ownerId: "user-owner",
};

const sharedProject: ApiProject = {
  id: "project-shared",
  name: "Shared Canvas",
  mode: "blank",
  status: "ready",
  createdAt: "2026-09-06T00:00:00.000Z",
  ownerId: "user-someone-else",
};

function renderSidebar(
  currentUserId: string | null,
  overrides: Partial<ComponentProps<typeof ProjectSidebar>> = {},
) {
  return render(
    <ProjectSidebar
      projects={[ownedProject, sharedProject]}
      selectedProjectId={null}
      isLoading={false}
      error={null}
      currentUserId={currentUserId}
      isOpen
      onToggleOpen={() => undefined}
      onSelectProject={() => undefined}
      onRequestCreateBlank={() => undefined}
      onRequestCreatePrompt={() => undefined}
      onDeleteProject={async () => undefined}
      {...overrides}
    />,
  );
}

describe("ProjectSidebar", () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockReset();
    vi.mocked(toast.success).mockReset();
  });

  it("hides the project list when collapsed", () => {
    renderSidebar("user-owner", { isOpen: false });

    expect(screen.queryByText("Owned Canvas")).toBeNull();
    expect(screen.queryByRole("button", { name: "Open Projects" })).toBeNull();
  });

  it("disables create buttons while projects are loading", () => {
    renderSidebar("user-owner", { isLoading: true });

    expect(
      (
        screen.getByRole("button", {
          name: "New blank project",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: "New prompt project",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("opens create dialogs from the project list actions", () => {
    const onRequestCreateBlank = vi.fn();
    const onRequestCreatePrompt = vi.fn();
    renderSidebar("user-owner", {
      onRequestCreateBlank,
      onRequestCreatePrompt,
    });

    fireEvent.click(screen.getByRole("button", { name: "New blank project" }));
    expect(onRequestCreateBlank).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole("button", { name: "New prompt project" }),
    );
    expect(onRequestCreatePrompt).toHaveBeenCalledTimes(1);
  });

  it("always shows an AI cue on the new prompt project button", () => {
    renderSidebar("user-owner");

    const promptButton = screen.getByRole("button", {
      name: "New prompt project",
    });

    expect(promptButton.querySelector(".animate-border-beam")).toBeTruthy();
    expect(promptButton.querySelector(".animate-ai-sparkle")).toBeTruthy();
  });

  it("lets the owner delete their Project", () => {
    renderSidebar("user-owner");

    const deleteOwned = screen.getByRole("button", {
      name: "Delete Owned Canvas",
    }) as HTMLButtonElement;
    const deleteShared = screen.getByRole("button", {
      name: "Delete Shared Canvas",
    }) as HTMLButtonElement;

    expect(deleteOwned.disabled).toBe(false);
    expect(deleteShared.disabled).toBe(true);
  });

  it("opens a delete confirmation modal instead of window.confirm", () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    renderSidebar("user-owner");

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Owned Canvas" }),
    );

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText('Delete "Owned Canvas"?')).toBeTruthy();
    confirmSpy.mockRestore();
  });

  it("does not delete when the modal is cancelled", () => {
    const onDeleteProject = vi.fn(async () => undefined);
    renderSidebar("user-owner", { onDeleteProject });

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Owned Canvas" }),
    );
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Cancel",
      }),
    );

    expect(onDeleteProject).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("deletes the project when confirmed in the modal", async () => {
    const onDeleteProject = vi.fn(async () => undefined);
    renderSidebar("user-owner", { onDeleteProject });

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Owned Canvas" }),
    );
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Delete",
      }),
    );

    await waitFor(() => {
      expect(onDeleteProject).toHaveBeenCalledWith("project-owned");
    });
    expect(toast.success).toHaveBeenCalledWith('Deleted "Owned Canvas"');
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("shows a loading state while deleting", async () => {
    let resolveDelete: () => void = () => undefined;
    const onDeleteProject = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        }),
    );
    renderSidebar("user-owner", { onDeleteProject });

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Owned Canvas" }),
    );
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(
        within(dialog).getByRole("button", { name: "Deleting..." }),
      ).toBeTruthy();
    });
    expect(
      (
        within(dialog).getByRole("button", { name: "Cancel" }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    resolveDelete();
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });
  });

  it("disables delete for a non-owner Collaborator", () => {
    renderSidebar("user-editor");

    const deleteOwned = screen.getByRole("button", {
      name: "Delete Owned Canvas",
    }) as HTMLButtonElement;
    const deleteShared = screen.getByRole("button", {
      name: "Delete Shared Canvas",
    }) as HTMLButtonElement;

    expect(deleteOwned.disabled).toBe(true);
    expect(deleteShared.disabled).toBe(true);
  });

  it("shows the full project name on hover when truncated", () => {
    renderSidebar("user-owner");

    expect(screen.getByTitle("Owned Canvas")).toBeTruthy();
    expect(screen.getByTitle("Shared Canvas")).toBeTruthy();
  });
});
