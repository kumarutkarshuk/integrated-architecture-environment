"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { FileCode2, FileText, Layers, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Editor } from "tldraw";
import { useAiGeneration } from "../hooks/useAiGeneration";
import { useCanvasAgent } from "../hooks/useCanvasAgent";
import { useCreateInvite } from "../hooks/useCreateInvite";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useExportSpec } from "../hooks/useExportSpec";
import { useOpenProject } from "../hooks/useOpenProject";
import { useProjects } from "../hooks/useProjects";
import {
  AI_SIDEBAR_STORAGE_KEY,
  PROJECTS_SIDEBAR_STORAGE_KEY,
  useSidebarOpen,
} from "../hooks/useSidebarOpen";
import { useYjsTldrawStore } from "../hooks/useYjsTldrawStore";
import { useStaggerReveal } from "../hooks/useStaggerReveal";
import { useIsMobile } from "../hooks/useIsMobile";
import { isLiveCanvasOnline } from "../lib/canvas";
import { isDesktopViewport } from "../lib/viewport";
import { deriveWorkspaceShellStatus } from "../lib/shellStatus";
import { ActivityBar } from "./ActivityBar";
import { AiCue } from "./AiCue";
import { AiSidebar } from "./AiSidebar";
import { CanvasSaveStatusLabel } from "./CanvasSaveStatusLabel";
import { CollapsibleSidebar } from "./CollapsibleSidebar";
import { RightActivityBar } from "./RightActivityBar";
import {
  CreateProjectDialog,
  type CreateProjectMode,
} from "./CreateProjectDialog";
import { ExportSpecPanel, ExportSpecToolbar } from "./ExportSpecToolbar";
import { InviteToolbar } from "./InviteToolbar";
import { PreviewCanvas } from "./PreviewCanvas";
import { CanvasLoadingPing, ProjectCanvas } from "./ProjectCanvas";
import { ProjectSidebar } from "./ProjectSidebar";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { GridPattern } from "./ui/grid-pattern";
import { WorkspaceStatusBar } from "./WorkspaceStatusBar";
import { WorkspaceTitlebar } from "./WorkspaceTitlebar";

export function WorkspaceShell() {
  const containerRef = useRef<HTMLDivElement>(null);
  const specCloseRef = useRef<(() => void) | null>(null);
  const { user, isLoading: isUserLoading, error: userError } = useCurrentUser();
  const {
    projects,
    isLoading: isProjectsLoading,
    error: projectsError,
    createBlankProject,
    createPromptProject,
    refreshProject,
    updateProjectInList,
    removeProject,
  } = useProjects(Boolean(user));
  const { selectedProjectId, selectProject, clearOpenProject } = useOpenProject(
    projects,
    { isLoading: isProjectsLoading, error: projectsError },
  );
  const { isOpen: isProjectsSidebarOpen, toggle: toggleProjectsSidebar } =
    useSidebarOpen(PROJECTS_SIDEBAR_STORAGE_KEY);
  const {
    isOpen: isAiSidebarOpen,
    toggle: toggleAiSidebar,
    setOpen: setAiSidebarOpen,
  } = useSidebarOpen(AI_SIDEBAR_STORAGE_KEY);
  const [initialPromptByProjectId, setInitialPromptByProjectId] = useState<
    Record<string, string>
  >({});
  const [createMode, setCreateMode] = useState<CreateProjectMode | null>(null);
  const [editorTab, setEditorTab] = useState<"canvas" | "spec">("canvas");
  const [canvasEditor, setCanvasEditor] = useState<Editor | null>(null);
  const isMobile = useIsMobile();

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const initialPrompt = selectedProject
    ? (initialPromptByProjectId[selectedProject.id] ?? null)
    : null;

  const exportSpec = useExportSpec(selectedProject);
  const invite = useCreateInvite(selectedProject, user);

  const canvasEnabled =
    Boolean(selectedProject) && selectedProject?.status === "ready";
  const presenceIdentity = useMemo(() => {
    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      name: user.displayName ?? user.email,
    };
  }, [user]);
  const { storeWithStatus, saveStatus, onEditorReady, publishAgentCursor } =
    useYjsTldrawStore(
      selectedProject?.id ?? null,
      canvasEnabled,
      presenceIdentity,
    );
  const {
    allowed: agentAllowed,
    requestAllowed: requestAgentAllowed,
    armConflict,
    resolveArmConflict,
  } = useCanvasAgent(
    selectedProject?.status ?? null,
    canvasEditor,
    selectedProject
      ? { id: selectedProject.id, name: selectedProject.name }
      : null,
    publishAgentCursor,
  );

  const handleEditorReady = useCallback(
    (editor: Editor) => {
      onEditorReady(editor);
      setCanvasEditor(editor);
    },
    [onEditorReady],
  );

  useEffect(() => {
    setCanvasEditor(null);
  }, [selectedProjectId, canvasEnabled]);

  const canvasActionsEnabled = isLiveCanvasOnline(storeWithStatus, saveStatus);
  const ai = useAiGeneration(
    selectedProject,
    refreshProject,
    updateProjectInList,
    initialPrompt,
    canvasActionsEnabled || saveStatus === "error",
  );

  const previewRecords =
    ai.isGenerating ? null : (ai.selectedPreview?.result?.records ?? null);

  const specTabVisible = Boolean(exportSpec.spec) || exportSpec.isExporting;
  const isProjectsListLoading = isUserLoading || isProjectsLoading;
  const canvasLabel = selectedProject
    ? `${selectedProject.name}.canvas`
    : "welcome.canvas";
  const specTabLabel = selectedProject
    ? `${selectedProject.name}.md`
    : "spec.md";

  const isPreviewing = Boolean(
    selectedProject &&
      (selectedProject.status !== "ready" || ai.isApplying),
  );
  const shellStatus = deriveWorkspaceShellStatus({
    hasProject: Boolean(selectedProject),
    projectReady: selectedProject?.status === "ready",
    isGenerating: ai.isGenerating,
    canvasActionsEnabled,
    saveStatus,
  });

  useEffect(() => {
    if (exportSpec.spec || exportSpec.isExporting) {
      setEditorTab("spec");
      return;
    }

    setEditorTab("canvas");
  }, [exportSpec.spec, exportSpec.isExporting]);

  useEffect(() => {
    if (editorTab !== "canvas") {
      return;
    }

    window.dispatchEvent(new Event("resize"));
  }, [editorTab]);

  useEffect(() => {
    if (!isPreviewing) {
      return;
    }
    if (!isDesktopViewport()) {
      return;
    }
    setAiSidebarOpen(true);
  }, [isPreviewing, setAiSidebarOpen]);

  const lockAiOpen = isPreviewing && !isMobile;

  useGSAP(
    () => {
      if (typeof window === "undefined") return;

      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      tl.fromTo(
        ".workspace-titlebar",
        { y: -6 },
        { y: 0, duration: 0.35, clearProps: "transform" },
      ).fromTo(
        ".workspace-statusbar",
        { y: 6 },
        { y: 0, duration: 0.3, clearProps: "transform" },
        "-=0.2",
      );
    },
    { scope: containerRef },
  );

  async function handleCreateBlankProject(name: string) {
    const project = await createBlankProject(name);
    selectProject(project.id);
  }

  async function handleCreatePromptProject(name: string, prompt: string) {
    const project = await createPromptProject(name, prompt);
    setInitialPromptByProjectId((current) => ({
      ...current,
      [project.id]: prompt,
    }));
    selectProject(project.id);
  }

  async function handleDeleteProject(projectId: string) {
    await removeProject(projectId);
    setInitialPromptByProjectId((current) => {
      const next = { ...current };
      delete next[projectId];
      return next;
    });
    if (selectedProjectId === projectId) {
      clearOpenProject();
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex h-dvh flex-col overflow-hidden bg-background text-foreground select-none"
    >
      <WorkspaceTitlebar
        selectedProjectName={selectedProject?.name ?? null}
        status={shellStatus}
      />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <ActivityBar
          isProjectsOpen={isProjectsSidebarOpen}
          onToggleProjects={toggleProjectsSidebar}
        />

        <ProjectSidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          isLoading={isProjectsListLoading}
          error={userError ?? projectsError}
          currentUserId={user?.id ?? null}
          isOpen={isProjectsSidebarOpen}
          onToggleOpen={toggleProjectsSidebar}
          onSelectProject={selectProject}
          onRequestCreateBlank={() => {
            if (isProjectsListLoading) {
              return;
            }

            setCreateMode("blank");
          }}
          onRequestCreatePrompt={() => {
            if (isProjectsListLoading) {
              return;
            }

            setCreateMode("prompt");
          }}
          onDeleteProject={handleDeleteProject}
        />

        <main className="flex min-w-0 flex-1 flex-col bg-panel overflow-hidden">
          <div
            aria-label="Canvas toolbar"
            className="h-9 shrink-0 overflow-x-auto overflow-y-hidden overscroll-x-contain border-b border-sidebar-border bg-[#181818] text-xs"
          >
            <div className="flex h-full min-w-max items-center gap-2 px-2">
              <div className="flex h-full shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => setEditorTab("canvas")}
                  title={canvasLabel}
                  className={`flex h-full shrink-0 cursor-pointer items-center gap-2 border-r border-sidebar-border px-3 font-mono text-xs select-none ${
                    editorTab === "canvas"
                      ? "border-t-2 border-t-accent bg-panel text-foreground"
                      : "bg-[#181818] text-muted hover:bg-hover hover:text-foreground"
                  }`}
                >
                  <FileCode2 className="h-3.5 w-3.5 shrink-0 text-accent" />
                  <span className="whitespace-nowrap">{canvasLabel}</span>
                </button>

                {specTabVisible && (
                  <div
                    className={`flex h-full shrink-0 items-center border-r border-sidebar-border ${
                      editorTab === "spec"
                        ? "border-t-2 border-t-accent bg-panel text-foreground"
                        : "bg-[#181818] text-muted"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setEditorTab("spec")}
                      title={specTabLabel}
                      className="flex h-full shrink-0 cursor-pointer items-center gap-2 px-3 font-mono text-xs hover:text-foreground"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                      <span className="whitespace-nowrap">{specTabLabel}</span>
                    </button>
                    {exportSpec.spec && (
                      <button
                        type="button"
                        aria-label="Close exported spec"
                        title="Close exported spec"
                        className="mr-1 cursor-pointer rounded p-0.5 text-muted hover:bg-hover hover:text-foreground"
                        onClick={() => specCloseRef.current?.()}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="ml-auto flex h-full shrink-0 items-center gap-1.5">
              {selectedProject && editorTab === "canvas" && (
                <span className="hidden h-6 items-center rounded-md border border-sidebar-border bg-sidebar px-2 font-mono text-[11px] text-muted md:inline-flex">
                  {selectedProject.status === "ready" ? "Canvas" : "Preview"}
                </span>
              )}

              {editorTab === "canvas" && (
                <>
                  {selectedProject?.status === "ready" && (
                    <InviteToolbar
                      canInvite={invite.canInvite}
                      actionsEnabled={canvasActionsEnabled}
                      isSending={invite.isSending}
                      currentUserEmail={user?.email ?? null}
                      collaborators={invite.collaborators}
                      isLoadingCollaborators={invite.isLoadingCollaborators}
                      resendingInviteId={invite.resendingInviteId}
                      onOpen={() => {
                        void invite.loadCollaborators();
                      }}
                      onInvite={(email) => {
                        void invite.invite(email);
                      }}
                      onResend={(inviteId) => {
                        void invite.resend(inviteId);
                      }}
                    />
                  )}

                  <ExportSpecToolbar
                    canExport={exportSpec.canExport}
                    actionsEnabled={canvasActionsEnabled}
                    isExporting={exportSpec.isExporting}
                    onExport={() => {
                      if (specTabVisible) {
                        toast.error("Close the spec tab");
                        return;
                      }
                      void exportSpec.exportSpec();
                    }}
                  />
                </>
              )}

              {selectedProject?.status === "ready" && editorTab === "canvas" && (
                <CanvasSaveStatusLabel status={saveStatus} />
              )}
            </div>
          </div>
          </div>

          <div
            className={
              editorTab === "canvas" ? "flex min-h-0 flex-1 flex-col" : "hidden"
            }
          >
            {!selectedProject && isProjectsListLoading && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-xs font-mono">
                <div className="flex items-center gap-2 text-sky-400">
                  <span className="h-2 w-2 animate-ping rounded-full bg-sky-400" />
                  <p className="text-muted">Loading projects...</p>
                </div>
              </div>
            )}

            {!selectedProject && !isProjectsListLoading && (
              <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-6 text-center select-none">
                <GridPattern
                  width={32}
                  height={32}
                  className="opacity-30 mask-[radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"
                />
                <WorkspaceEmptyStart
                  onCreateBlank={() => setCreateMode("blank")}
                  onCreatePrompt={() => setCreateMode("prompt")}
                />
              </div>
            )}

            {selectedProject &&
              selectedProject.status !== "ready" &&
              previewRecords && (
                <PreviewCanvas records={previewRecords} />
              )}

            {selectedProject &&
              selectedProject.status !== "ready" &&
              !previewRecords && (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-xs font-mono">
                  {ai.generationFailed && !ai.isGenerating ? (
                    <>
                      <p className="font-semibold text-red-400">
                        Preview generation failed.
                      </p>
                      <p className="text-muted">
                        {ai.generationError ?? "Loading reason..."}
                      </p>
                    </>
                  ) : ai.previewWaitTimedOut ? (
                    <>
                      <p className="font-semibold text-red-400">
                        Preview load timed out
                      </p>
                      <p className="text-muted">
                        Check your connection and try again.
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-sky-400">
                      <span className="h-2 w-2 animate-ping rounded-full bg-sky-400" />
                      <p className="text-muted">
                        {ai.isGenerating
                          ? "Generating preview..."
                          : "Waiting for preview..."}
                      </p>
                    </div>
                  )}
                </div>
              )}

            {selectedProject &&
              selectedProject.status === "ready" &&
              !storeWithStatus && (
                <CanvasLoadingPing
                  label={`Loading canvas for ${selectedProject.name}...`}
                />
              )}

            {selectedProject &&
              selectedProject.status === "ready" &&
              storeWithStatus && (
                <ProjectCanvas
                  projectName={selectedProject.name}
                  storeWithStatus={storeWithStatus}
                  saveStatus={saveStatus}
                  onEditorReady={handleEditorReady}
                />
              )}
          </div>

          {specTabVisible && (
            <div
              className={
                editorTab === "spec" ? "flex min-h-0 flex-1 flex-col" : "hidden"
              }
            >
              <ExportSpecPanel
                spec={exportSpec.spec}
                specJob={exportSpec.specJob}
                isExporting={exportSpec.isExporting}
                downloadFileName={exportSpec.downloadFileName}
                onClear={exportSpec.clearSpec}
                onCopy={() => {
                  void exportSpec.copySpec();
                }}
                onDownload={exportSpec.downloadSpec}
                onRate={(value) => {
                  void exportSpec.rateSpec(value);
                }}
                closeRef={specCloseRef}
              />
            </div>
          )}
        </main>

        <CollapsibleSidebar
          title="AI panel"
          side="right"
          isOpen={isAiSidebarOpen}
          openWidthClass="w-72"
          lockOpen={lockAiOpen}
          onToggleOpen={toggleAiSidebar}
        >
          <AiSidebar
            ai={ai}
            project={selectedProject}
            agentAllowed={agentAllowed}
            canvasLive={canvasActionsEnabled || saveStatus === "error"}
            onAgentAllowedChange={requestAgentAllowed}
          />
        </CollapsibleSidebar>

        <RightActivityBar
          isAiOpen={isAiSidebarOpen}
          lockOpen={lockAiOpen}
          onToggleAi={toggleAiSidebar}
        />
      </div>

      <WorkspaceStatusBar projectName={selectedProject?.name} />

      <CreateProjectDialog
        mode={createMode}
        onClose={() => setCreateMode(null)}
        onCreateBlankProject={handleCreateBlankProject}
        onCreatePromptProject={handleCreatePromptProject}
      />

      <AlertDialog
        open={armConflict !== null}
        onOpenChange={(open) => {
          if (!open) {
            resolveArmConflict("cancel");
          }
        }}
      >
        <AlertDialogContent className="border-sidebar-border bg-sidebar text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Another tab is already allowed</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{armConflict?.otherProjectName}&quot; is the active project.
              This tab has &quot;{armConflict?.thisProjectName}&quot;. Keep the
              first, switch to this tab, or cancel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => resolveArmConflict("cancel")}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => resolveArmConflict("keep")}
            >
              Keep
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => resolveArmConflict("switch")}
            >
              Switch
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function WorkspaceEmptyStart({
  onCreateBlank,
  onCreatePrompt,
}: {
  onCreateBlank: () => void;
  onCreatePrompt: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useStaggerReveal(ref, {
    itemsKey: "empty-start",
    enabled: true,
    fromY: 10,
  });

  return (
    <div ref={ref} className="relative z-10 max-w-md space-y-4">
      <div data-stagger-item="copy">
        <h2 className="text-base font-semibold text-foreground">
          Integrated Architecture Environment
        </h2>
        <p className="mt-1 text-xs text-muted">
          Select or create a project to start designing
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 text-left font-mono text-xs sm:grid-cols-2">
        <button
          type="button"
          data-stagger-item="blank"
          onClick={onCreateBlank}
          className="cursor-pointer rounded-lg border border-sidebar-border bg-sidebar/70 p-3 text-left transition-colors hover:border-accent/50 hover:bg-hover"
        >
          <div className="flex items-center gap-1.5 font-semibold text-accent">
            <Layers className="h-3.5 w-3.5" />
            <span>New Canvas</span>
          </div>
          <p className="mt-1 text-[10px] text-muted">
            Start with a blank multiplayer workspace.
          </p>
        </button>

        <button
          type="button"
          data-stagger-item="prompt"
          onClick={onCreatePrompt}
          className="relative cursor-pointer rounded-lg border border-sky-400/35 bg-sidebar/70 p-3 text-left transition-colors hover:border-sky-400/60 hover:bg-hover"
        >
          <AiCue duration={7} />
          <div className="relative flex items-center gap-1.5 font-semibold text-sky-400">
            <Sparkles className="h-3.5 w-3.5 animate-ai-sparkle" />
            <span>AI Prompt</span>
          </div>
          <p className="relative mt-1 text-[10px] text-muted">
            Synthesize complete system topology using AI.
          </p>
        </button>
      </div>
    </div>
  );
}
