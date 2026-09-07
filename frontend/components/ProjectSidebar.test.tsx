import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiProject } from "../lib/api";
import { clerkAppearance } from "../lib/clerkAppearance";
import { ProjectSidebar } from "./ProjectSidebar";

const userButtonProps: { appearance?: unknown }[] = [];

vi.mock("@clerk/nextjs", () => ({
  UserButton: (props: { appearance?: unknown }) => {
    userButtonProps.push(props);
    return <div>Account</div>;
  },
}));

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
      onCreateBlankProject={async () => undefined}
      onCreatePromptProject={async () => undefined}
      onDeleteProject={async () => undefined}
      {...overrides}
    />,
  );
}

describe("ProjectSidebar", () => {
  beforeEach(() => {
    userButtonProps.length = 0;
    vi.mocked(toast.error).mockReset();
    vi.mocked(toast.success).mockReset();
  });

  it("hides the project list when collapsed and still lets it be opened", () => {
    const onToggleOpen = vi.fn();
    renderSidebar("user-owner", { isOpen: false, onToggleOpen });

    expect(screen.queryByText("Owned Canvas")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open Projects" }));
    expect(onToggleOpen).toHaveBeenCalledTimes(1);
  });

  it("renders the account button with the dark theme", () => {
    renderSidebar("user-owner");

    expect(userButtonProps[0]?.appearance).toBe(clerkAppearance);
  });

  it("shows an in-app name field when choosing a new blank Project", () => {
    const promptSpy = vi.spyOn(window, "prompt");
    renderSidebar("user-owner");

    fireEvent.click(
      screen.getByRole("button", { name: "New blank project" }),
    );

    expect(screen.getByLabelText("Name")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Create blank project" }),
    ).toBeTruthy();
    expect(promptSpy).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it("does not create a blank Project when the name is empty or whitespace", async () => {
    const onCreateBlankProject = vi.fn(async () => undefined);
    renderSidebar("user-owner", { onCreateBlankProject });

    fireEvent.click(
      screen.getByRole("button", { name: "New blank project" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Create blank project" }),
    );

    expect(onCreateBlankProject).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Name is required");
    expect(screen.queryByText("Name is required")).toBeNull();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "   " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create blank project" }),
    );

    expect(onCreateBlankProject).not.toHaveBeenCalled();
  });

  it("creates a blank Project with a trimmed name", async () => {
    const onCreateBlankProject = vi.fn(async () => undefined);
    renderSidebar("user-owner", { onCreateBlankProject });

    fireEvent.click(
      screen.getByRole("button", { name: "New blank project" }),
    );
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "  Payment service  " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create blank project" }),
    );

    await waitFor(() => {
      expect(onCreateBlankProject).toHaveBeenCalledWith("Payment service");
    });
    expect(toast.success).toHaveBeenCalledWith('Created "Payment service"');
    expect(
      screen.queryByRole("button", { name: "Create blank project" }),
    ).toBeNull();
  });

  it("lets the User dismiss the blank form without creating", () => {
    const onCreateBlankProject = vi.fn(async () => undefined);
    renderSidebar("user-owner", { onCreateBlankProject });

    fireEvent.click(
      screen.getByRole("button", { name: "New blank project" }),
    );
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Payment service" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Cancel blank project" }),
    );

    expect(
      screen.queryByRole("button", { name: "Create blank project" }),
    ).toBeNull();
    expect(onCreateBlankProject).not.toHaveBeenCalled();
  });

  it("closes the other create form when one is opened", () => {
    renderSidebar("user-owner");

    fireEvent.click(
      screen.getByRole("button", { name: "New prompt project" }),
    );
    expect(screen.getByLabelText("Prompt")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "New blank project" }),
    );
    expect(screen.queryByLabelText("Prompt")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Create blank project" }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "New prompt project" }),
    );
    expect(
      screen.queryByRole("button", { name: "Create blank project" }),
    ).toBeNull();
    expect(screen.getByLabelText("Prompt")).toBeTruthy();
  });

  it("shows a toast when creating a blank Project fails", async () => {
    const onCreateBlankProject = vi.fn(async () => {
      throw new Error("Failed to fetch");
    });
    renderSidebar("user-owner", { onCreateBlankProject });

    fireEvent.click(
      screen.getByRole("button", { name: "New blank project" }),
    );
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Payment service" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create blank project" }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Could not reach the server. Check your connection and try again.",
      );
    });
    expect(
      screen.getByRole("button", { name: "Create blank project" }),
    ).toBeTruthy();
    expect(
      screen.queryByText(
        "Could not reach the server. Check your connection and try again.",
      ),
    ).toBeNull();
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
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Delete" }),
    );

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

  it("creates a prompt Project when name and prompt are provided", async () => {
    const onCreatePromptProject = vi.fn(async () => undefined);
    renderSidebar("user-owner", { onCreatePromptProject });

    fireEvent.click(
      screen.getByRole("button", { name: "New prompt project" }),
    );
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Payment service" },
    });
    fireEvent.change(screen.getByLabelText("Prompt"), {
      target: { value: "Design a payment flow" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create prompt project" }),
    );

    await waitFor(() => {
      expect(onCreatePromptProject).toHaveBeenCalledWith(
        "Payment service",
        "Design a payment flow",
      );
    });
    expect(toast.success).toHaveBeenCalledWith('Created "Payment service"');
  });

  it("shows a toast when prompt form validation fails", () => {
    renderSidebar("user-owner");

    fireEvent.click(
      screen.getByRole("button", { name: "New prompt project" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Create prompt project" }),
    );

    expect(toast.error).toHaveBeenCalledWith("Name and prompt are required");
    expect(screen.queryByText("Name and prompt are required")).toBeNull();
  });

  it("shows a toast when creating a prompt Project fails", async () => {
    const onCreatePromptProject = vi.fn(async () => {
      throw new Error("Daily generate limit reached (5 per day)");
    });

    renderSidebar("user-owner", { onCreatePromptProject });

    fireEvent.click(
      screen.getByRole("button", { name: "New prompt project" }),
    );
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Payment service" },
    });
    fireEvent.change(screen.getByLabelText("Prompt"), {
      target: { value: "Design a payment flow" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create prompt project" }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Daily generate limit reached (5 per day)",
      );
    });
    expect(
      screen.queryByText("Daily generate limit reached (5 per day)"),
    ).toBeNull();
  });
});
