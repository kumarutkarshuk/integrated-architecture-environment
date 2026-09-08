"use client";

import { UserButton } from "@clerk/nextjs";
import { LayoutGrid, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useAiGeneration } from "../hooks/useAiGeneration";
import { useCreateInvite } from "../hooks/useCreateInvite";
import { useExportSpec } from "../hooks/useExportSpec";
import { useOpenProject } from "../hooks/useOpenProject";
import { useProjects } from "../hooks/useProjects";
import { useYjsTldrawStore } from "../hooks/useYjsTldrawStore";
import {
  AI_SIDEBAR_STORAGE_KEY,
  PROJECTS_SIDEBAR_STORAGE_KEY,
  useSidebarOpen,
} from "../hooks/useSidebarOpen";
import {
  AI_SIDEBAR_WIDTH_STORAGE_KEY,
  DEFAULT_AI_SIDEBAR_WIDTH,
  DEFAULT_PROJECTS_SIDEBAR_WIDTH,
  PROJECTS_SIDEBAR_WIDTH_STORAGE_KEY,
  useSidebarWidth,
} from "../hooks/useSidebarWidth";
import { isLiveCanvasOnline } from "../lib/canvas";
import { clerkAppearance } from "../lib/clerkAppearance";
import { ActivityBar } from "./ActivityBar";
import { AiSidebar } from "./AiSidebar";
import { CanvasSaveStatusLabel } from "./CanvasSaveStatusLabel";
import { CollapsibleSidebar } from "./CollapsibleSidebar";
import { EditorTabs, type EditorTabMode } from "./EditorTabs";
import { ExportSpecToolbar } from "./ExportSpecToolbar";
import { InviteToolbar } from "./InviteToolbar";
import { PreviewCanvas } from "./PreviewCanvas";
import { ProjectCanvas } from "./ProjectCanvas";
import { ProjectSidebar } from "./ProjectSidebar";
import { StatusBar } from "./StatusBar";
import { Button } from "./ui/button";

export function WorkspaceShell() {
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
  const { isOpen: isAiSidebarOpen, toggle: toggleAiSidebar } = useSidebarOpen(
    AI_SIDEBAR_STORAGE_KEY,
  );
  const {
    width: projectsWidth,
    startResizing: startProjectsResize,
  } = useSidebarWidth({
    storageKey: PROJECTS_SIDEBAR_WIDTH_STORAGE_KEY,
    defaultWidth: DEFAULT_PROJECTS_SIDEBAR_WIDTH,
  });
  const {
    width: aiWidth,
    startResizing: startAiResize,
  } = useSidebarWidth({
    storageKey: AI_SIDEBAR_WIDTH_STORAGE_KEY,
    defaultWidth: DEFAULT_AI_SIDEBAR_WIDTH,
  });

  const [initialPromptByProjectId, setInitialPromptByProjectId] = useState<
    Record<string, string>
  >({});
  const [selectedTabOverride, setSelectedTabOverride] =
    useState<EditorTabMode | null>(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  useEffect(() => {
    setSelectedTabOverride(null);
  }, [selectedProjectId]);

  const defaultTab: EditorTabMode =
    selectedProject?.status === "ready" ? "canvas" : "preview";
  const activeTab: EditorTabMode = selectedTabOverride ?? defaultTab;

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

  const {
    storeWithStatus,
    saveStatus,
    connectionHealth = "online",
    collaboratorCount = 1,
    onEditorReady,
  } = useYjsTldrawStore(
    selectedProject?.id ?? null,
    canvasEnabled,
    presenceIdentity,
  );
  const canvasActionsEnabled = isLiveCanvasOnline(storeWithStatus, saveStatus);

  const previewRecords =
    ai.isGenerating ? null : (ai.selectedPreview?.result?.records ?? null);

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

  function handleActivityBarNewProject() {
    if (!isProjectsSidebarOpen) {
      toggleProjectsSidebar();
    }
  }

  function handleActivityBarExportSpec() {
    if (exportSpec.canExport && canvasActionsEnabled) {
      void exportSpec.exportSpec();
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Titlebar */}
      <header className="flex h-9 shrink-0 items-center border-b border-sidebar-border bg-titlebar px-3 text-sm">
        <span className="font-medium">Integrated Architecture Environment</span>
        {user && (
          <span className="ml-3 text-muted">
            {user.displayName ?? user.email}
          </span>
        )}
        {selectedProject && (
          <span className="ml-3 text-muted">/ {selectedProject.name}</span>
        )}
      </header>

      {/* Main workspace row with Activity Bar, Sidebars, and Canvas */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 48px Left Activity Bar */}
        <ActivityBar
          isProjectsOpen={isProjectsSidebarOpen}
          isAiOpen={isAiSidebarOpen}
          onToggleProjects={toggleProjectsSidebar}
          onToggleAi={toggleAiSidebar}
          onNewProject={handleActivityBarNewProject}
          onExportSpec={handleActivityBarExportSpec}
          canExportSpec={exportSpec.canExport && canvasActionsEnabled}
          accountSlot={
            <UserButton appearance={clerkAppearance} afterSignOutUrl="/" />
          }
        />

        {/* Primary Sidebar (Projects) */}
        <ProjectSidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          isLoading={isUserLoading || isProjectsLoading}
          error={userError ?? projectsError}
          currentUserId={user?.id ?? null}
          isOpen={isProjectsSidebarOpen}
          width={projectsWidth}
          onStartResize={startProjectsResize}
          onToggleOpen={toggleProjectsSidebar}
          onSelectProject={selectProject}
          onCreateBlankProject={handleCreateBlankProject}
          onCreatePromptProject={handleCreatePromptProject}
          onDeleteProject={handleDeleteProject}
        />

        {/* Center Canvas Area */}
        <main className="flex min-w-0 flex-1 flex-col bg-panel">
          {/* Editor Tabs Strip */}
          <EditorTabs
            activeTab={activeTab}
            onSelectTab={setSelectedTabOverride}
            isProjectReady={selectedProject?.status === "ready"}
            projectName={selectedProject?.name}
            actions={
              <>
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
                  spec={exportSpec.spec}
                  downloadFileName={exportSpec.downloadFileName}
                  onExport={() => {
                    void exportSpec.exportSpec();
                  }}
                  onClear={exportSpec.clearSpec}
                  onCopy={() => {
                    void exportSpec.copySpec();
                  }}
                  onDownload={exportSpec.downloadSpec}
                />
                {selectedProject?.status === "ready" && (
                  <CanvasSaveStatusLabel status={saveStatus} />
                )}
              </>
            }
          />

          {!selectedProject && (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">
              Select or create a project to start designing
            </div>
          )}

          {/* Active Tab: AI Preview */}
          {selectedProject && activeTab === "preview" && (
            <div className="flex flex-1 flex-col">
              {/* Informative banner distinguishing proposal preview from live canvas */}
              <div className="flex items-center justify-between border-b border-purple-500/30 bg-purple-950/20 px-3 py-1.5 text-xs text-purple-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-3.5 text-purple-400" />
                  <span>
                    Viewing AI proposal preview (read-only) — changes not yet
                    applied to live canvas.
                  </span>
                </div>
                {selectedProject.status !== "ready" && (
                  <span className="text-[11px] text-purple-300/80">
                    Apply from the AI Assistant panel to unlock editing.
                  </span>
                )}
              </div>

              {previewRecords && (
                <PreviewCanvas
                  records={previewRecords}
                  label={ai.selectedPreview?.prompt ?? selectedProject.name}
                />
              )}

              {!previewRecords && (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm">
                  {ai.generationFailed ? (
                    <>
                      <p className="text-red-400">Preview generation failed.</p>
                      <p className="text-muted">
                        Check your Groq API key and model, then regenerate from
                        the AI panel.
                      </p>
                    </>
                  ) : ai.previewWaitTimedOut ? (
                    <>
                      <p className="text-red-400">Preview load timed out</p>
                      <p className="text-muted">
                        Check your connection and try again.
                      </p>
                    </>
                  ) : ai.isGenerating ? (
                    <p className="text-muted">Generating preview...</p>
                  ) : selectedProject.status === "ready" ? (
                    <>
                      <p className="text-muted">
                        Live canvas has already been applied.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTabOverride("canvas")}
                      >
                        Back to Live Canvas
                      </Button>
                    </>
                  ) : (
                    <p className="text-muted">Waiting for preview...</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Active Tab: Live Canvas */}
          {selectedProject && activeTab === "canvas" && (
            <>
              {selectedProject.status === "ready" && storeWithStatus && (
                <ProjectCanvas
                  projectName={selectedProject.name}
                  storeWithStatus={storeWithStatus}
                  saveStatus={saveStatus}
                  onEditorReady={onEditorReady}
                />
              )}

              {selectedProject.status !== "ready" && (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm">
                  <LayoutGrid className="size-10 text-muted/50" />
                  <p className="font-medium text-foreground">
                    Live Canvas Locked
                  </p>
                  <p className="max-w-md text-xs text-muted">
                    This canvas is locked until an AI proposal preview is
                    applied. Switch to the AI Preview tab to review candidate
                    designs.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTabOverride("preview")}
                  >
                    View AI Preview
                  </Button>
                </div>
              )}
            </>
          )}
        </main>

        {/* Secondary Sidebar (AI Assistant) */}
        <CollapsibleSidebar
          title="AI Assistant"
          side="right"
          isOpen={isAiSidebarOpen}
          width={aiWidth}
          onStartResize={startAiResize}
          openWidthClass="w-72"
          onToggleOpen={toggleAiSidebar}
        >
          <AiSidebar ai={ai} project={selectedProject} />
        </CollapsibleSidebar>
      </div>

      {/* 22px Bottom Status Bar */}
      <StatusBar
        saveStatus={saveStatus}
        connectionHealth={connectionHealth}
        collaboratorCount={collaboratorCount}
        projectName={selectedProject?.name}
        mode={!selectedProject ? "none" : activeTab}
      />
    </div>
  );
}
