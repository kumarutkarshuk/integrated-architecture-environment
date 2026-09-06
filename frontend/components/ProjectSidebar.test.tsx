import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiProject } from "../lib/api";
import { ProjectSidebar } from "./ProjectSidebar";

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <div>Account</div>,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
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
    vi.mocked(toast.error).mockReset();
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

  it("keeps prompt form validation next to the form", () => {
    renderSidebar("user-owner");

    fireEvent.click(
      screen.getByRole("button", { name: "New prompt project" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Create prompt project" }),
    );

    expect(screen.getByText("Name and prompt are required")).toBeTruthy();
    expect(toast.error).not.toHaveBeenCalled();
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
