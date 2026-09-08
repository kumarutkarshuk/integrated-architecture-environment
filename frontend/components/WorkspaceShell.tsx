"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { FileCode2, FileText, FolderPlus, Layers, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAiGeneration } from "../hooks/useAiGeneration";
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
import { isLiveCanvasOnline } from "../lib/canvas";
import { deriveWorkspaceShellStatus } from "../lib/shellStatus";
import { ActivityBar } from "./ActivityBar";
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
import { ProjectCanvas } from "./ProjectCanvas";
import { ProjectSidebar } from "./ProjectSidebar";
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

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const initialPrompt = selectedProject
    ? (initialPromptByProjectId[selectedProject.id] ?? null)
    : null;

  const ai = useAiGeneration(
    selectedProject,
    refreshProject,
    updateProjectInList,
    initialPrompt,
  );
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
  const { storeWithStatus, saveStatus, onEditorReady } = useYjsTldrawStore(
    selectedProject?.id ?? null,
    canvasEnabled,
    presenceIdentity,
  );
  const canvasActionsEnabled = isLiveCanvasOnline(storeWithStatus, saveStatus);

  const previewRecords =
    ai.isGenerating ? null : (ai.selectedPreview?.result?.records ?? null);

  const specTabVisible = Boolean(exportSpec.spec) || exportSpec.isExporting;
  const canvasLabel = selectedProject
    ? `${selectedProject.name}.canvas`
    : "welcome.canvas";

  const isPreviewing = Boolean(
    selectedProject && selectedProject.status !== "ready",
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
    if (isPreviewing) {
      setAiSidebarOpen(true);
    }
  }, [isPreviewing, setAiSidebarOpen]);

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
      className="flex h-screen flex-col bg-background text-foreground overflow-hidden select-none"
    >
      <WorkspaceTitlebar
        selectedProjectName={selectedProject?.name ?? null}
        status={shellStatus}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ActivityBar
          isProjectsOpen={isProjectsSidebarOpen}
          onToggleProjects={toggleProjectsSidebar}
        />

        <ProjectSidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          isLoading={isUserLoading || isProjectsLoading}
          error={userError ?? projectsError}
          currentUserId={user?.id ?? null}
          isOpen={isProjectsSidebarOpen}
          onToggleOpen={toggleProjectsSidebar}
          onSelectProject={selectProject}
          onRequestCreateBlank={() => setCreateMode("blank")}
          onRequestCreatePrompt={() => setCreateMode("prompt")}
          onDeleteProject={handleDeleteProject}
        />

        <main className="flex min-w-0 flex-1 flex-col bg-panel overflow-hidden">
          <div className="flex h-9 shrink-0 items-center justify-between border-b border-sidebar-border bg-[#181818] px-2 text-xs">
            <div className="flex min-w-0 items-center h-full">
              <button
                type="button"
                onClick={() => setEditorTab("canvas")}
                title={canvasLabel}
                className={`flex h-full max-w-45 cursor-pointer items-center gap-2 border-r border-sidebar-border px-3 font-mono text-xs select-none ${
                  editorTab === "canvas"
                    ? "border-t-2 border-t-accent bg-panel text-foreground"
                    : "bg-[#181818] text-muted hover:bg-hover hover:text-foreground"
                }`}
              >
                <FileCode2 className="h-3.5 w-3.5 shrink-0 text-accent" />
                <span className="truncate">{canvasLabel}</span>
              </button>

              {specTabVisible && (
                <div
                  className={`flex h-full max-w-45 items-center border-r border-sidebar-border ${
                    editorTab === "spec"
                      ? "border-t-2 border-t-accent bg-panel text-foreground"
                      : "bg-[#181818] text-muted"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setEditorTab("spec")}
                    title={exportSpec.downloadFileName}
                    className="flex h-full min-w-0 cursor-pointer items-center gap-2 px-3 font-mono text-xs hover:text-foreground"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                    <span className="truncate">
                      {exportSpec.isExporting && !exportSpec.spec
                        ? "exporting-spec.md"
                        : exportSpec.downloadFileName}
                    </span>
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

            <div className="flex items-center gap-2">
              {selectedProject && editorTab === "canvas" && (
                <span className="hidden font-mono text-[11px] text-muted md:inline">
                  {selectedProject.status === "ready" ? "Canvas" : "Preview"}
                </span>
              )}

              <InviteToolbar
                canInvite={invite.canInvite}
                actionsEnabled={canvasActionsEnabled}
                isSending={invite.isSending}
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

              <ExportSpecToolbar
                canExport={exportSpec.canExport}
                actionsEnabled={canvasActionsEnabled}
                isExporting={exportSpec.isExporting}
                onExport={() => {
                  void exportSpec.exportSpec();
                }}
              />

              {selectedProject?.status === "ready" && editorTab === "canvas" && (
                <CanvasSaveStatusLabel status={saveStatus} />
              )}
            </div>
          </div>

          <div
            className={
              editorTab === "canvas" ? "flex min-h-0 flex-1 flex-col" : "hidden"
            }
          >
            {!selectedProject && (
              <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-6 text-center select-none">
                <GridPattern
                  width={32}
                  height={32}
                  className="opacity-30 mask-[radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"
                />
                <div className="relative z-10 max-w-md space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar/80 shadow-md">
                    <Layers className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      Integrated Architecture Environment
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      Select or create a project to start designing
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-left font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => setCreateMode("blank")}
                      className="cursor-pointer rounded-lg border border-sidebar-border bg-sidebar/70 p-3 text-left hover:border-accent/50 hover:bg-hover transition-colors"
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-accent">
                        <FolderPlus className="h-3.5 w-3.5" />
                        <span>New Canvas</span>
                      </div>
                      <p className="mt-1 text-[10px] text-muted">
                        Start with a blank multiplayer Tldraw canvas.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCreateMode("prompt")}
                      className="cursor-pointer rounded-lg border border-sidebar-border bg-sidebar/70 p-3 text-left hover:border-accent/50 hover:bg-hover transition-colors"
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-sky-400">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>AI Prompt</span>
                      </div>
                      <p className="mt-1 text-[10px] text-muted">
                        Synthesize complete system topology via Groq.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedProject &&
              selectedProject.status !== "ready" &&
              previewRecords && (
                <PreviewCanvas
                  records={previewRecords}
                  label={ai.selectedPreview?.prompt ?? selectedProject.name}
                />
              )}

            {selectedProject &&
              selectedProject.status !== "ready" &&
              !previewRecords && (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-xs font-mono">
                  {ai.generationFailed ? (
                    <>
                      <p className="font-semibold text-red-400">
                        Preview generation failed.
                      </p>
                      <p className="text-muted">
                        Check your Groq API key and model, then regenerate from
                        the AI panel.
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
                  ) : ai.isGenerating ? (
                    <div className="flex items-center gap-2 text-sky-400">
                      <span className="h-2 w-2 animate-ping rounded-full bg-sky-400" />
                      <p className="text-muted">Generating preview...</p>
                    </div>
                  ) : (
                    <p className="text-muted">Waiting for preview...</p>
                  )}
                </div>
              )}

            {selectedProject &&
              selectedProject.status === "ready" &&
              storeWithStatus && (
                <ProjectCanvas
                  projectName={selectedProject.name}
                  storeWithStatus={storeWithStatus}
                  saveStatus={saveStatus}
                  onEditorReady={onEditorReady}
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
                isExporting={exportSpec.isExporting}
                downloadFileName={exportSpec.downloadFileName}
                onClear={exportSpec.clearSpec}
                onCopy={() => {
                  void exportSpec.copySpec();
                }}
                onDownload={exportSpec.downloadSpec}
                closeRef={specCloseRef}
              />
            </div>
          )}
        </main>

        <CollapsibleSidebar
          title="AI Assistant"
          side="right"
          isOpen={isAiSidebarOpen}
          openWidthClass="w-72"
          lockOpen={isPreviewing}
          onToggleOpen={toggleAiSidebar}
        >
          <AiSidebar ai={ai} project={selectedProject} />
        </CollapsibleSidebar>

        <RightActivityBar
          isAiOpen={isAiSidebarOpen}
          lockOpen={isPreviewing}
          onToggleAi={toggleAiSidebar}
        />
      </div>

      <WorkspaceStatusBar
        status={shellStatus}
        collaboratorCount={invite.joinedCount}
        projectName={selectedProject?.name}
      />

      <CreateProjectDialog
        mode={createMode}
        onClose={() => setCreateMode(null)}
        onCreateBlankProject={handleCreateBlankProject}
        onCreatePromptProject={handleCreatePromptProject}
      />
    </div>
  );
}
