import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ApiProject } from "../lib/api";
import { ProjectSidebar } from "./ProjectSidebar";

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <div>Account</div>,
}));

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

function renderSidebar(currentUserId: string | null) {
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
    />,
  );
}

describe("ProjectSidebar", () => {
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
});
