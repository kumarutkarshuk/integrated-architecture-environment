import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceShell } from "./WorkspaceShell";

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <div>Account</div>,
}));

vi.mock("./ProjectCanvas", () => ({
  ProjectCanvas: () => <div>Canvas</div>,
}));

vi.mock("./PreviewCanvas", () => ({
  PreviewCanvas: () => <div>Preview</div>,
}));

vi.mock("../hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: {
      id: "user-1",
      email: "ada@example.com",
      displayName: "Ada",
    },
    isLoading: false,
    error: null,
  }),
}));

vi.mock("../hooks/useProjects", () => ({
  useProjects: () => ({
    projects: [
      {
        id: "project-1",
        name: "Owned Canvas",
        mode: "blank",
        status: "ready",
        createdAt: "2026-09-06T00:00:00.000Z",
        ownerId: "user-1",
      },
    ],
    isLoading: false,
    error: null,
    createBlankProject: async () => undefined,
    createPromptProject: async () => undefined,
    refreshProject: async () => undefined,
    updateProjectInList: () => undefined,
    removeProject: async () => undefined,
  }),
}));

vi.mock("../hooks/useOpenProject", () => ({
  useOpenProject: () => ({
    selectedProjectId: "project-1",
    selectProject: () => undefined,
    clearOpenProject: () => undefined,
  }),
}));

vi.mock("../hooks/useAiGeneration", () => ({
  useAiGeneration: () => ({
    prompt: "",
    setPrompt: () => undefined,
    previews: [],
    selectedPreview: null,
    selectedPreviewId: null,
    setSelectedPreviewId: () => undefined,
    isBusy: false,
    isGenerating: false,
    generationFailed: false,
    previewWaitTimedOut: false,
    regenerate: async () => undefined,
    applySelectedPreview: async () => undefined,
    loadPreviews: async () => undefined,
  }),
}));

vi.mock("../hooks/useExportSpec", () => ({
  useExportSpec: () => ({
    canExport: true,
    isExporting: false,
    spec: null,
    downloadFileName: "owned-canvas-spec.md",
    exportSpec: async () => undefined,
    clearSpec: () => undefined,
    downloadSpec: () => undefined,
    copySpec: async () => undefined,
  }),
}));

vi.mock("../hooks/useCreateInvite", () => ({
  useCreateInvite: () => ({
    canInvite: true,
    isSending: false,
    collaborators: [],
    isLoadingCollaborators: false,
    resendingInviteId: null,
    loadCollaborators: async () => undefined,
    invite: async () => undefined,
    resend: async () => undefined,
  }),
}));

vi.mock("../hooks/useYjsTldrawStore", () => ({
  useYjsTldrawStore: () => ({
    storeWithStatus: {
      status: "synced-remote",
      connectionStatus: "online",
    },
    saveStatus: "saved",
    onEditorReady: () => undefined,
  }),
}));

describe("WorkspaceShell", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts with both sidebars open", () => {
    render(<WorkspaceShell />);

    expect(screen.getByText("Projects")).toBeTruthy();
    expect(screen.getByText("AI Assistant")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Invite" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Spec" })).toBeTruthy();
  });

  it("collapses each sidebar on its own and keeps Invite and Spec in the toolbar", () => {
    render(<WorkspaceShell />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse Projects" }));

    expect(screen.getByRole("button", { name: "Open Projects" })).toBeTruthy();
    expect(screen.queryByText("Owned Canvas")).toBeNull();
    expect(screen.getByText("AI Assistant")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Invite" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Spec" })).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Collapse AI Assistant" }),
    );

    expect(
      screen.getByRole("button", { name: "Open AI Assistant" }),
    ).toBeTruthy();
    expect(screen.queryByText("AI Assistant")).toBeNull();
    expect(screen.getByRole("button", { name: "Invite" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Spec" })).toBeTruthy();
  });

  it("restores sidebar open state from this browser", async () => {
    window.localStorage.setItem("iae.sidebar.projects.open", "false");
    window.localStorage.setItem("iae.sidebar.ai.open", "false");

    render(<WorkspaceShell />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open Projects" })).toBeTruthy();
    });
    expect(
      screen.getByRole("button", { name: "Open AI Assistant" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Invite" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Spec" })).toBeTruthy();
  });
});
