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

  it("toggles side panels via the 48px activity bar", () => {
    render(<WorkspaceShell />);

    const explorerTool = screen.getByRole("button", { name: "Explorer" });
    const aiTool = screen.getByRole("button", { name: "AI Assistant" });

    expect(screen.getByText("Projects")).toBeTruthy();
    expect(screen.getByText("AI Assistant")).toBeTruthy();

    // Toggle Projects panel via Activity Bar
    fireEvent.click(explorerTool);
    expect(screen.queryByText("Owned Canvas")).toBeNull();

    // Toggle Projects panel back open via Activity Bar
    fireEvent.click(explorerTool);
    expect(screen.getByText("Owned Canvas")).toBeTruthy();

    // Toggle AI Assistant panel via Activity Bar
    fireEvent.click(aiTool);
    expect(screen.queryByText("Prompt")).toBeNull();

    // Toggle AI Assistant panel back open via Activity Bar
    fireEvent.click(aiTool);
    expect(screen.getByText("AI Assistant")).toBeTruthy();
  });

  it("displays live canvas save state, connection health, and online collaborator count in the 22px status bar", () => {
    render(<WorkspaceShell />);

    const statusBar = screen.getByRole("status", { name: "Status Bar" });
    expect(statusBar.classList.contains("h-5.5")).toBe(true);

    expect(screen.getByTestId("status-bar-save").textContent).toContain("Saved");
    expect(screen.getByTestId("status-bar-connection").textContent).toContain(
      "Connected",
    );
    expect(screen.getByTestId("status-bar-collaborators").textContent).toContain(
      "1 collaborator online",
    );
  });

  it("switches editor tabs between Live Canvas and AI Preview mode with distinct status styling", () => {
    render(<WorkspaceShell />);

    const canvasTab = screen.getByRole("tab", { name: "Live Canvas Tab" });
    const previewTab = screen.getByRole("tab", { name: "AI Preview Tab" });

    // Initially on ready project, Live Canvas is active
    expect(canvasTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Live")).toBeTruthy();
    expect(screen.getByText("Canvas")).toBeTruthy();

    // Switch to AI Preview tab
    fireEvent.click(previewTab);

    expect(previewTab.getAttribute("aria-selected")).toBe("true");
    expect(canvasTab.getAttribute("aria-selected")).toBe("false");
    expect(screen.getByText("AI Proposal")).toBeTruthy();
    expect(
      screen.getByText(/Viewing AI proposal preview \(read-only\)/),
    ).toBeTruthy();

    // Switch back to Live Canvas tab
    fireEvent.click(canvasTab);
    expect(canvasTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Canvas")).toBeTruthy();
  });

  it("preserves user width preferences for workspace side drawers", () => {
    window.localStorage.setItem("iae.sidebar.projects.width", "340");
    window.localStorage.setItem("iae.sidebar.ai.width", "380");

    render(<WorkspaceShell />);

    const projectsAside = screen.getByText("Owned Canvas").closest("aside");
    const aiAside = screen.getByText("AI Assistant").closest("aside");

    expect(projectsAside?.getAttribute("style")).toContain("width: 340px");
    expect(aiAside?.getAttribute("style")).toContain("width: 380px");
  });
});
