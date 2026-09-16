import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureProductEvent } from "../lib/analytics";
import { createMemoryArmNetwork } from "../lib/canvas-agent/arm-bus";
import { toast } from "sonner";
import { WorkspaceShell } from "./WorkspaceShell";

const workspaceState = vi.hoisted(() => ({
  isUserLoading: false,
  isProjectsLoading: false,
  selectedProjectId: "project-1" as string | null,
  projectMode: "blank" as "blank" | "prompt",
  projectStatus: "ready" as "ready" | "generating" | "preview" | "failed",
  hasPreview: false,
  selectedPreviewId: null as string | null,
  isApplying: false,
  hasSecondProject: false,
  spec: null as { markdown: string; gaps_summary: string } | null,
  exportSpec: async () => undefined as void,
  canvasStore: "live" as "live" | "loading" | "missing",
}));

const webMcpSupport = vi.hoisted(() => ({ compatible: true }));

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <div>Account</div>,
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("../lib/analytics", () => ({
  captureProductEvent: vi.fn(),
  identifySignedInUser: vi.fn(),
  initSignedInAnalytics: vi.fn(),
}));

vi.mock("./ProjectCanvas", () => ({
  ProjectCanvas: () => <div>Canvas</div>,
  CanvasLoadingPing: ({ label = "Loading canvas..." }: { label?: string }) => (
    <div>{label}</div>
  ),
}));

vi.mock("../lib/canvas-agent/webmcp", () => ({
  mountWebMcpRelayEmbed: () => undefined,
  registerCanvasAgentTools: async () => undefined,
}));

vi.mock("../lib/canvas-agent/webmcp-support", () => ({
  isWebMcpCompatibleBrowser: () => webMcpSupport.compatible,
}));

vi.mock("../lib/canvas-agent/tldraw-editor", () => ({
  createTldrawEditorPort: () => ({
    getCurrentPageShapes: () => [],
    isWritable: () => true,
    getShapeBounds: () => null,
    createShape: () => undefined,
    updateShape: () => undefined,
    deleteShape: () => undefined,
    zoomToBounds: () => undefined,
    zoomIn: () => undefined,
    zoomOut: () => undefined,
    clampZoom: () => undefined,
  }),
}));

const armHarness = vi.hoisted(() => {
  let bus: ReturnType<
    ReturnType<
      typeof import("../lib/canvas-agent/arm-bus").createMemoryArmNetwork
    >["attach"]
  > | null = null;
  let network: ReturnType<
    typeof import("../lib/canvas-agent/arm-bus").createMemoryArmNetwork
  > | null = null;

  return {
    getBus() {
      if (!bus) {
        throw new Error("arm bus not set");
      }
      return bus;
    },
    getNetwork() {
      if (!network) {
        throw new Error("arm network not set");
      }
      return network;
    },
    set(
      nextNetwork: NonNullable<typeof network>,
      nextBus: NonNullable<typeof bus>,
    ) {
      network = nextNetwork;
      bus = nextBus;
    },
  };
});

vi.mock("../lib/canvas-agent/arm-bus", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../lib/canvas-agent/arm-bus")>();
  return {
    ...actual,
    createBrowserArmBus: () => armHarness.getBus(),
  };
});

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
      ...(workspaceState.hasSecondProject
        ? [
            {
              id: "project-2",
              name: "Second Canvas",
              mode: "blank" as const,
              status: "ready" as const,
              createdAt: "2026-09-06T00:00:00.000Z",
              ownerId: "user-1",
            },
          ]
        : []),
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
  useAiGeneration: () => {
    const previews = workspaceState.hasPreview
      ? [
          {
            id: "preview-1",
            prompt: "Design a todo API",
            status: "completed",
            result: { records: {} },
            appliedAt: null,
            createdAt: "2026-09-14T00:00:01.000Z",
            rating: null,
          },
          {
            id: "preview-2",
            prompt: "Design a payments API",
            status: "completed",
            result: { records: { shape: { id: "shape:1" } } },
            appliedAt: null,
            createdAt: "2026-09-14T00:00:02.000Z",
            rating: null,
          },
        ]
      : [];
    const selectedPreviewId =
      workspaceState.selectedPreviewId ??
      (workspaceState.hasPreview ? "preview-1" : null);

    return {
      prompt: "",
      setPrompt: () => undefined,
      previews,
      selectedPreview:
        previews.find((preview) => preview.id === selectedPreviewId) ?? null,
      selectedPreviewId,
      setSelectedPreviewId: () => undefined,
      isBusy: false,
      isApplying: workspaceState.isApplying,
      isGenerating: workspaceState.projectStatus === "generating",
      generationFailed: false,
      generationError: null,
      previewWaitTimedOut: false,
      appliedJob: null,
      isAppliedJobLoading: false,
      rateJob: async () => undefined,
      regenerate: async () => undefined,
      applySelectedPreview: async () => undefined,
      loadPreviews: async () => undefined,
    };
  },
}));

vi.mock("../hooks/useExportSpec", () => ({
  formatSpecFile: (spec: { markdown: string; gaps_summary: string }) =>
    `${spec.markdown}\n\n---\n\n## Gaps summary\n\n${spec.gaps_summary}\n`,
  useExportSpec: () => ({
    canExport: true,
    isExporting: false,
    spec: workspaceState.spec,
    specJob: null,
    downloadFileName: "owned-canvas-spec.md",
    exportSpec: () => workspaceState.exportSpec(),
    clearSpec: () => undefined,
    downloadSpec: () => undefined,
    copySpec: async () => undefined,
    rateSpec: async () => undefined,
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
    storeWithStatus:
      workspaceState.canvasStore === "missing"
        ? null
        : workspaceState.canvasStore === "loading"
          ? { status: "loading" }
          : {
              status: "synced-remote",
              connectionStatus: "online",
            },
    saveStatus: workspaceState.canvasStore === "live" ? "saved" : "loading",
    onEditorReady: () => undefined,
  }),
}));

const clipboardWriteText = vi.fn(async (_text: string) => undefined);

function stubPhoneViewport() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("max-width: 767px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

describe("WorkspaceShell", () => {
  beforeEach(() => {
    workspaceState.isUserLoading = false;
    workspaceState.isProjectsLoading = false;
    workspaceState.selectedProjectId = "project-1";
    workspaceState.projectMode = "blank";
    workspaceState.projectStatus = "ready";
    workspaceState.hasPreview = false;
    workspaceState.selectedPreviewId = null;
    workspaceState.isApplying = false;
    workspaceState.hasSecondProject = false;
    workspaceState.spec = null;
    workspaceState.exportSpec = async () => undefined;
    workspaceState.canvasStore = "live";
    webMcpSupport.compatible = true;
    vi.mocked(toast).mockReset();
    vi.mocked(toast.error).mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(captureProductEvent).mockReset();
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
    const network = createMemoryArmNetwork();
    armHarness.set(network, network.attach("workspace-tab"));
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

    expect(screen.queryByRole("button", { name: "Collapse Projects" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "New blank project" }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Explorer View" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Collapse AI panel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Invite" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Spec" })).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Collapse AI panel" }),
    );

    expect(screen.queryByRole("button", { name: "Collapse AI panel" })).toBeNull();
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
      expect(screen.queryByRole("button", { name: "Collapse Projects" })).toBeNull();
    });
    expect(screen.queryByRole("button", { name: "Collapse AI panel" })).toBeNull();
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

  it("blocks Export Spec from the canvas tab while the spec tab is open", () => {
    const exportSpec = vi.fn(async () => undefined);
    workspaceState.spec = {
      markdown: "# Spec",
      gaps_summary: "None",
    };
    workspaceState.exportSpec = exportSpec;

    render(<WorkspaceShell />);
    fireEvent.click(screen.getByRole("button", { name: "Owned Canvas.canvas" }));
    fireEvent.click(screen.getByRole("button", { name: "Export Spec" }));

    expect(toast.error).toHaveBeenCalledWith("Close the spec tab");
    expect(exportSpec).not.toHaveBeenCalled();
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
    expect(
      screen.getByText(/ask the agent to use WebMCP to modify the canvas/i),
    ).toBeTruthy();
    expect(screen.getByText(/Reload turns it off/i)).toBeTruthy();
    expect(
      (
        screen.getByRole("switch", {
          name: "Allow agent to edit this canvas",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    expect(
      screen.queryByText(/This browser cannot let an agent draw/i),
    ).toBeNull();
    expect(toast).not.toHaveBeenCalled();
    expect(
      screen
        .getByRole("switch", { name: "Allow agent to edit this canvas" })
        .closest(".relative")
        ?.querySelector(".animate-border-beam"),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "AI panel View" })
        .querySelector(".animate-border-beam"),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Copy Cursor setup" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Copy Claude Code setup" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy Codex setup" })).toBeTruthy();
    expect(screen.queryByText("Chat coming soon...")).toBeNull();
  });

  it("disables Allow agent with a reason when the browser is not WebMCP compatible", () => {
    webMcpSupport.compatible = false;

    render(<WorkspaceShell />);

    const allowSwitch = screen.getByRole("switch", {
      name: "Allow agent to edit this canvas",
    }) as HTMLButtonElement;

    expect(allowSwitch.disabled).toBe(true);
    expect(
      screen.getByText(
        "This browser cannot let an agent draw on the canvas. Use desktop Chrome or Edge.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/Reload turns it off/i)).toBeNull();
    expect(toast).not.toHaveBeenCalled();
  });

  it("disables Allow agent on a phone viewport even when the browser looks compatible", async () => {
    stubPhoneViewport();

    render(<WorkspaceShell />);

    await waitFor(() => {
      expect(
        screen.queryByRole("switch", {
          name: "Allow agent to edit this canvas",
        }),
      ).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "AI panel View" }));

    const allowSwitch = (await screen.findByRole("switch", {
      name: "Allow agent to edit this canvas",
    })) as HTMLButtonElement;

    await waitFor(() => {
      expect(allowSwitch.disabled).toBe(true);
    });
    expect(
      screen.getByText(
        "Agents cannot edit the canvas on phones. Use desktop Chrome or Edge.",
      ),
    ).toBeTruthy();
    expect(toast).not.toHaveBeenCalled();
  });

  it("starts with both sidebars closed on a phone viewport", async () => {
    stubPhoneViewport();

    render(<WorkspaceShell />);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Collapse Projects" }),
      ).toBeNull();
    });
    expect(
      screen.queryByRole("button", { name: "Collapse AI panel" }),
    ).toBeNull();
    expect(
      screen.getByText("For a better experience, use a desktop browser."),
    ).toBeTruthy();
    expect(screen.getByLabelText("Canvas toolbar")).toBeTruthy();
  });

  it("keeps the AI panel open after a preview is applied on desktop", async () => {
    workspaceState.projectMode = "prompt";
    workspaceState.projectStatus = "preview";
    workspaceState.hasPreview = true;

    const { rerender } = render(<WorkspaceShell />);

    expect(
      await screen.findByRole("button", { name: "Apply preview" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Collapse AI panel" }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Apply preview" }));

    workspaceState.isApplying = true;
    rerender(<WorkspaceShell />);
    workspaceState.projectStatus = "ready";
    workspaceState.hasPreview = false;
    workspaceState.isApplying = false;
    rerender(<WorkspaceShell />);

    expect(
      screen.getByRole("button", { name: "Collapse AI panel" }),
    ).toBeTruthy();
  });

  it("closes the AI panel on a phone after a preview is applied", async () => {
    workspaceState.projectMode = "prompt";
    workspaceState.projectStatus = "preview";
    workspaceState.hasPreview = true;
    stubPhoneViewport();

    const { rerender } = render(<WorkspaceShell />);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Collapse AI panel" }),
      ).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "AI panel View" }));
    expect(
      await screen.findByRole("button", { name: "Apply preview" }),
    ).toBeTruthy();

    workspaceState.isApplying = true;
    rerender(<WorkspaceShell />);
    workspaceState.projectStatus = "ready";
    workspaceState.hasPreview = false;
    workspaceState.isApplying = false;
    rerender(<WorkspaceShell />);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Collapse AI panel" }),
      ).toBeNull();
    });
  });

  it("keeps the projects sidebar open after a project switch on desktop", async () => {
    workspaceState.hasSecondProject = true;

    const { rerender } = render(<WorkspaceShell />);

    expect(
      screen.getByRole("button", { name: "Collapse Projects" }),
    ).toBeTruthy();

    workspaceState.selectedProjectId = "project-2";
    workspaceState.canvasStore = "missing";
    rerender(<WorkspaceShell />);
    workspaceState.canvasStore = "live";
    rerender(<WorkspaceShell />);

    expect(
      screen.getByRole("button", { name: "Collapse Projects" }),
    ).toBeTruthy();
  });

  it("closes the projects sidebar on a phone after a switched project canvas loads", async () => {
    workspaceState.hasSecondProject = true;
    stubPhoneViewport();

    const { rerender } = render(<WorkspaceShell />);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Collapse Projects" }),
      ).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Explorer View" }));
    expect(
      await screen.findByRole("button", { name: "Collapse Projects" }),
    ).toBeTruthy();

    workspaceState.selectedProjectId = "project-2";
    workspaceState.canvasStore = "missing";
    rerender(<WorkspaceShell />);

    expect(
      screen.getByRole("button", { name: "Collapse Projects" }),
    ).toBeTruthy();
    expect(screen.getByText("Loading canvas for Second Canvas...")).toBeTruthy();

    workspaceState.canvasStore = "live";
    rerender(<WorkspaceShell />);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Collapse Projects" }),
      ).toBeNull();
    });
  });

  it("closes the AI panel on a phone after a preview is selected and loaded", async () => {
    workspaceState.projectMode = "prompt";
    workspaceState.projectStatus = "preview";
    workspaceState.hasPreview = true;
    workspaceState.selectedPreviewId = "preview-1";
    stubPhoneViewport();

    const { rerender } = render(<WorkspaceShell />);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Collapse AI panel" }),
      ).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "AI panel View" }));
    expect(
      await screen.findByRole("button", { name: "Collapse AI panel" }),
    ).toBeTruthy();

    workspaceState.selectedPreviewId = "preview-2";
    rerender(<WorkspaceShell />);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Collapse AI panel" }),
      ).toBeNull();
    });
  });

  it("lets phones close the AI panel during preview", async () => {
    workspaceState.projectMode = "prompt";
    workspaceState.projectStatus = "preview";
    workspaceState.hasPreview = true;
    stubPhoneViewport();

    render(<WorkspaceShell />);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Collapse AI panel" }),
      ).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "AI panel View" }));

    const collapse = await screen.findByRole("button", {
      name: "Collapse AI panel",
    });
    expect(collapse).toHaveProperty("disabled", false);

    fireEvent.click(collapse);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Collapse AI panel" }),
      ).toBeNull();
    });
  });

  it("opens only one sidebar at a time on a phone viewport", async () => {
    stubPhoneViewport();

    render(<WorkspaceShell />);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Collapse Projects" }),
      ).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Explorer View" }));
    expect(
      await screen.findByRole("button", { name: "Collapse Projects" }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "AI panel View" }));
    expect(
      await screen.findByRole("button", { name: "Collapse AI panel" }),
    ).toBeTruthy();
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Collapse Projects" }),
      ).toBeNull();
    });
  });

  it("copies Cursor setup from the AI panel", async () => {
    render(<WorkspaceShell />);

    fireEvent.click(screen.getByRole("button", { name: "Copy Cursor setup" }));

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith(
        expect.stringContaining("mcpServers"),
      );
    });
    expect(captureProductEvent).toHaveBeenCalledWith("mcp_config_copied", {
      client: "cursor",
    });
  });

  it("records mcp_config_copied for Claude Code and Codex", async () => {
    render(<WorkspaceShell />);

    fireEvent.click(screen.getByRole("button", { name: "Copy Claude Code setup" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy Codex setup" }));

    await waitFor(() => {
      expect(captureProductEvent).toHaveBeenCalledWith("mcp_config_copied", {
        client: "claude_code",
      });
    });
    expect(captureProductEvent).toHaveBeenCalledWith("mcp_config_copied", {
      client: "codex",
    });
  });

  it("shows sidebar loading text and a center ping while a ready Project canvas loads", () => {
    workspaceState.projectMode = "blank";
    workspaceState.projectStatus = "ready";
    workspaceState.canvasStore = "missing";

    render(<WorkspaceShell />);

    expect(screen.getByText("Loading...")).toBeTruthy();
    expect(screen.getByText("Loading canvas for Owned Canvas...")).toBeTruthy();
    expect(
      screen.queryByRole("switch", { name: "Allow agent to edit this canvas" }),
    ).toBeNull();
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
    workspaceState.hasPreview = true;

    render(<WorkspaceShell />);

    expect(screen.getByPlaceholderText("Describe the system...")).toBeTruthy();
    expect(
      screen.queryByRole("switch", { name: "Allow agent to edit this canvas" }),
    ).toBeNull();
    expect(screen.queryByText("Chat coming soon...")).toBeNull();
  });

  it("disables the AI panel while generating or waiting for Preview", () => {
    workspaceState.projectMode = "prompt";
    workspaceState.projectStatus = "generating";

    const { unmount } = render(<WorkspaceShell />);

    expect(screen.queryByPlaceholderText("Describe the system...")).toBeNull();
    expect(screen.getAllByText("Generating preview...").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.queryByRole("switch", { name: "Allow agent to edit this canvas" }),
    ).toBeNull();

    unmount();
    workspaceState.projectStatus = "preview";
    render(<WorkspaceShell />);

    expect(screen.queryByPlaceholderText("Describe the system...")).toBeNull();
    expect(screen.getAllByText("Waiting for preview...").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.queryByRole("switch", { name: "Allow agent to edit this canvas" }),
    ).toBeNull();
  });

  it("keeps Preview iteration when generate failed", () => {
    workspaceState.projectMode = "prompt";
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
    expect(captureProductEvent).toHaveBeenCalledWith("agent_allowed", {
      projectId: "project-1",
    });

    unmount();
    render(<WorkspaceShell />);

    expect(
      screen.getByRole("switch", { name: "Allow agent to edit this canvas" })
        .getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("asks keep / switch / cancel with both Project names when a second tab hits Allow", () => {
    openSecondAllow();

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/Owned Canvas/)).toBeTruthy();
    expect(within(dialog).getByText(/Payments/)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Keep" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Switch" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(armHarness.getBus().hasClaim()).toBe(false);
    expect(captureProductEvent).toHaveBeenCalledWith("agent_arm_conflict", {
      projectId: "project-1",
    });
  });

  it("keeps the first tab armed when Keep is chosen", () => {
    openSecondAllow();
    fireEvent.click(screen.getByRole("button", { name: "Keep" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(
      screen.getByRole("switch", { name: "Allow agent to edit this canvas" })
        .getAttribute("aria-checked"),
    ).toBe("false");
    expect(armHarness.getBus().hasClaim()).toBe(false);
    expect(armHarness.getBus().listArmed()).toEqual([OTHER_ARMED]);
  });

  it("makes this tab the Active Project when Switch is chosen", () => {
    openSecondAllow();
    fireEvent.click(screen.getByRole("button", { name: "Switch" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(
      screen.getByRole("switch", { name: "Allow agent to edit this canvas" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(armHarness.getBus().hasClaim()).toBe(true);
    expect(armHarness.getBus().listArmed()).toEqual([
      {
        tabId: "workspace-tab",
        projectId: "project-1",
        projectName: "Owned Canvas",
      },
    ]);
    expect(captureProductEvent).toHaveBeenCalledWith("agent_allowed", {
      projectId: "project-1",
    });
  });

  it("leaves the first tab armed when Cancel is chosen", () => {
    openSecondAllow();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(
      screen.getByRole("switch", { name: "Allow agent to edit this canvas" })
        .getAttribute("aria-checked"),
    ).toBe("false");
    expect(armHarness.getBus().hasClaim()).toBe(false);
    expect(armHarness.getBus().listArmed()).toEqual([OTHER_ARMED]);
  });

  it("releases the Active Project when Allow is turned off", () => {
    render(<WorkspaceShell />);
    fireEvent.click(
      screen.getByRole("switch", { name: "Allow agent to edit this canvas" }),
    );
    expect(armHarness.getBus().hasClaim()).toBe(true);

    fireEvent.click(
      screen.getByRole("switch", { name: "Allow agent to edit this canvas" }),
    );

    expect(
      screen.getByRole("switch", { name: "Allow agent to edit this canvas" })
        .getAttribute("aria-checked"),
    ).toBe("false");
    expect(armHarness.getBus().hasClaim()).toBe(false);
    expect(armHarness.getBus().listArmed()).toEqual([]);
    expect(captureProductEvent).toHaveBeenCalledWith("agent_disallowed", {
      projectId: "project-1",
    });
  });
});

const OTHER_ARMED = {
  tabId: "other-tab",
  projectId: "project-2",
  projectName: "Payments",
};

function openSecondAllow() {
  armHarness.getNetwork().seed([OTHER_ARMED]);
  render(<WorkspaceShell />);
  fireEvent.click(
    screen.getByRole("switch", { name: "Allow agent to edit this canvas" }),
  );
}
