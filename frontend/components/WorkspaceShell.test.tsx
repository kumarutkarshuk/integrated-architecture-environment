import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceShell } from "./WorkspaceShell";

const workspaceState = vi.hoisted(() => ({
  isUserLoading: false,
  isProjectsLoading: false,
  selectedProjectId: "project-1" as string | null,
  projectMode: "blank" as "blank" | "prompt",
  projectStatus: "ready" as "ready" | "generating" | "preview" | "failed",
  spec: null as { markdown: string; gaps_summary: string } | null,
}));

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <div>Account</div>,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("./ProjectCanvas", () => ({
  ProjectCanvas: () => <div>Canvas</div>,
}));

vi.mock("../lib/canvas-agent/webmcp", () => ({
  mountWebMcpRelayEmbed: () => undefined,
  registerCanvasReadTool: async () => undefined,
}));

vi.mock("../lib/canvas-agent/tldraw-editor", () => ({
  createTldrawEditorPort: () => ({
    getCurrentPageShapes: () => [],
  }),
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
    isLoading: workspaceState.isUserLoading,
    error: null,
  }),
}));

vi.mock("../hooks/useProjects", () => ({
  useProjects: () => ({
    projects: [
      {
        id: "project-1",
        name: "Owned Canvas",
        mode: workspaceState.projectMode,
        status: workspaceState.projectStatus,
        createdAt: "2026-09-06T00:00:00.000Z",
        ownerId: "user-1",
      },
    ],
    isLoading: workspaceState.isProjectsLoading,
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
    selectedProjectId: workspaceState.selectedProjectId,
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
    isApplying: false,
    isGenerating: false,
    generationFailed: false,
    previewWaitTimedOut: false,
    regenerate: async () => undefined,
    applySelectedPreview: async () => undefined,
    loadPreviews: async () => undefined,
  }),
}));

vi.mock("../hooks/useExportSpec", () => ({
  formatSpecFile: (spec: { markdown: string; gaps_summary: string }) =>
    `${spec.markdown}\n\n---\n\n## Gaps summary\n\n${spec.gaps_summary}\n`,
  useExportSpec: () => ({
    canExport: true,
    isExporting: false,
    spec: workspaceState.spec,
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
    joinedCount: 0,
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

const clipboardWriteText = vi.fn(async (_text: string) => undefined);

describe("WorkspaceShell", () => {
  beforeEach(() => {
    workspaceState.isUserLoading = false;
    workspaceState.isProjectsLoading = false;
    workspaceState.selectedProjectId = "project-1";
    workspaceState.projectMode = "blank";
    workspaceState.projectStatus = "ready";
    workspaceState.spec = null;
    clipboardWriteText.mockReset();
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
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows loading text and disables create while projects load", () => {
    workspaceState.isProjectsLoading = true;
    workspaceState.selectedProjectId = null;

    render(<WorkspaceShell />);

    expect(screen.getAllByText("Loading projects...").length).toBeGreaterThan(
      0,
    );
    expect(
      (
        screen.getByRole("button", {
          name: "New blank project",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(screen.queryByText("New Canvas")).toBeNull();
  });

  it("starts with both sidebars open", () => {
    render(<WorkspaceShell />);

    expect(screen.getByText("Projects")).toBeTruthy();
    expect(screen.getByText("AI panel")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Invite" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Spec" })).toBeTruthy();
  });

  it("collapses each sidebar on its own and keeps Invite and Spec in the toolbar", () => {
    render(<WorkspaceShell />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse Projects" }));

    expect(screen.queryByText("Projects")).toBeNull();
    expect(screen.queryByText("Owned Canvas")).toBeNull();
    expect(screen.getByRole("button", { name: "Explorer View" })).toBeTruthy();
    expect(screen.getByText("AI panel")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Invite" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Spec" })).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Collapse AI panel" }),
    );

    expect(screen.queryByText("AI panel")).toBeNull();
    expect(
      screen.getByRole("button", { name: "AI panel View" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Invite" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Spec" })).toBeTruthy();
  });

  it("restores sidebar open state from this browser", async () => {
    window.localStorage.setItem("iae.sidebar.projects.open", "false");
    window.localStorage.setItem("iae.sidebar.ai.open", "false");

    render(<WorkspaceShell />);

    await waitFor(() => {
      expect(screen.queryByText("Projects")).toBeNull();
    });
    expect(screen.queryByText("AI panel")).toBeNull();
    expect(screen.getByRole("button", { name: "Explorer View" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "AI panel View" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Invite" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Spec" })).toBeTruthy();
  });

  it("names the spec tab after the project and hides Invite and Export Spec", () => {
    workspaceState.spec = {
      markdown: "# Spec",
      gaps_summary: "None",
    };

    render(<WorkspaceShell />);

    expect(screen.getByTitle("Owned Canvas.md")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Invite" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Export Spec" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Close exported spec" }),
    ).toBeTruthy();
  });

  it("hides Invite on preview and always shows a solo session", () => {
    workspaceState.projectMode = "prompt";
    workspaceState.projectStatus = "generating";

    render(<WorkspaceShell />);

    expect(screen.queryByRole("button", { name: "Invite" })).toBeNull();
    expect(screen.getByText("Idle")).toBeTruthy();
    expect(screen.getByText("Solo session")).toBeTruthy();
    expect(screen.queryByText("CRDT Live")).toBeNull();
  });

  it("always shows an AI cue on the empty canvas AI Prompt card", () => {
    workspaceState.selectedProjectId = null;

    render(<WorkspaceShell />);

    const promptCard = screen.getByRole("button", { name: /AI Prompt/ });
    expect(promptCard.querySelector(".animate-border-beam")).toBeTruthy();
    expect(promptCard.querySelector(".animate-ai-sparkle")).toBeTruthy();
  });

  it("shows Allow agent and client setup on a ready blank Project, not chat-coming-soon", () => {
    render(<WorkspaceShell />);

    expect(
      screen.getByRole("switch", { name: "Allow agent to edit this canvas" }),
    ).toBeTruthy();
    expect(screen.getByText("Cursor")).toBeTruthy();
    expect(screen.getByText("Claude Code")).toBeTruthy();
    expect(screen.getByText("Codex")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy Cursor setup" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Copy Claude Code setup" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy Codex setup" })).toBeTruthy();
    expect(screen.queryByText("Chat coming soon...")).toBeNull();
  });

  it("copies Cursor setup from the AI panel", async () => {
    render(<WorkspaceShell />);

    fireEvent.click(screen.getByRole("button", { name: "Copy Cursor setup" }));

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith(
        expect.stringContaining("mcpServers"),
      );
    });
  });

  it("shows Allow agent on a ready prompt Project", () => {
    workspaceState.projectMode = "prompt";
    workspaceState.projectStatus = "ready";

    render(<WorkspaceShell />);

    expect(
      screen.getByRole("switch", { name: "Allow agent to edit this canvas" }),
    ).toBeTruthy();
    expect(screen.queryByText("Chat coming soon...")).toBeNull();
    expect(screen.queryByPlaceholderText("Describe the system...")).toBeNull();
  });

  it("keeps Preview iteration on a prompt Project that is not ready", () => {
    workspaceState.projectMode = "prompt";
    workspaceState.projectStatus = "preview";

    render(<WorkspaceShell />);

    expect(screen.getByPlaceholderText("Describe the system...")).toBeTruthy();
    expect(
      screen.queryByRole("switch", { name: "Allow agent to edit this canvas" }),
    ).toBeNull();
    expect(screen.queryByText("Chat coming soon...")).toBeNull();
  });

  it("keeps Preview iteration while generating or failed", () => {
    workspaceState.projectMode = "prompt";
    workspaceState.projectStatus = "generating";

    const { unmount } = render(<WorkspaceShell />);

    expect(screen.getByPlaceholderText("Describe the system...")).toBeTruthy();
    expect(
      screen.queryByRole("switch", { name: "Allow agent to edit this canvas" }),
    ).toBeNull();

    unmount();
    workspaceState.projectStatus = "failed";
    render(<WorkspaceShell />);

    expect(screen.getByPlaceholderText("Describe the system...")).toBeTruthy();
    expect(
      screen.queryByRole("switch", { name: "Allow agent to edit this canvas" }),
    ).toBeNull();
  });

  it("starts Allow off and stays off after a remount", () => {
    const { unmount } = render(<WorkspaceShell />);
    const allowSwitch = screen.getByRole("switch", {
      name: "Allow agent to edit this canvas",
    });

    expect(allowSwitch.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(allowSwitch);
    expect(
      screen.getByRole("switch", { name: "Allow agent to edit this canvas" })
        .getAttribute("aria-checked"),
    ).toBe("true");

    unmount();
    render(<WorkspaceShell />);

    expect(
      screen.getByRole("switch", { name: "Allow agent to edit this canvas" })
        .getAttribute("aria-checked"),
    ).toBe("false");
  });
});
