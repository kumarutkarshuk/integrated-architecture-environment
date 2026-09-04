"use client";

import { useMemo, useState } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useAiGeneration } from "../hooks/useAiGeneration";
import { useProjects } from "../hooks/useProjects";
import { useYjsTldrawStore } from "../hooks/useYjsTldrawStore";
import { AiSidebar } from "./AiSidebar";
import { CanvasSaveStatusLabel } from "./CanvasSaveStatusLabel";
import { PreviewCanvas } from "./PreviewCanvas";
import { ProjectCanvas } from "./ProjectCanvas";
import { ProjectSidebar } from "./ProjectSidebar";

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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [initialPromptByProjectId, setInitialPromptByProjectId] = useState<
    Record<string, string>
  >({});

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

  const canvasEnabled =
    Boolean(selectedProject) && selectedProject?.status === "ready";
  const { storeWithStatus, saveStatus, onEditorReady } = useYjsTldrawStore(
    selectedProject?.id ?? null,
    canvasEnabled,
  );

  const previewRecords = ai.selectedPreview?.result?.records ?? null;

  async function handleCreateBlankProject(name: string) {
    const project = await createBlankProject(name);
    setSelectedProjectId(project.id);
  }

  async function handleCreatePromptProject(name: string, prompt: string) {
    const project = await createPromptProject(name, prompt);
    setInitialPromptByProjectId((current) => ({
      ...current,
      [project.id]: prompt,
    }));
    setSelectedProjectId(project.id);
  }

  async function handleDeleteProject(projectId: string) {
    await removeProject(projectId);
    setInitialPromptByProjectId((current) => {
      const next = { ...current };
      delete next[projectId];
      return next;
    });
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-9 items-center border-b border-sidebar-border bg-titlebar px-3 text-sm">
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

      <div className="flex min-h-0 flex-1">
        <ProjectSidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          isLoading={isUserLoading || isProjectsLoading}
          error={userError ?? projectsError}
          onSelectProject={setSelectedProjectId}
          onCreateBlankProject={handleCreateBlankProject}
          onCreatePromptProject={handleCreatePromptProject}
          onDeleteProject={handleDeleteProject}
        />

        <main className="flex min-w-0 flex-1 flex-col bg-panel">
          <div className="flex h-9 items-center justify-between border-b border-sidebar-border px-3 text-xs">
            <span className="text-muted">
              {selectedProject?.status === "ready" ? "Canvas" : "Preview"}
            </span>
            {selectedProject?.status === "ready" && (
              <CanvasSaveStatusLabel status={saveStatus} />
            )}
          </div>

          {!selectedProject && (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">
              Select or create a project to start designing
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
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm">
                {ai.generationFailed ? (
                  <>
                    <p className="text-red-400">Preview generation failed.</p>
                    <p className="text-muted">
                      Check your Groq API key and model, then regenerate from
                      the AI panel.
                    </p>
                  </>
                ) : ai.isGenerating ? (
                  <p className="text-muted">Generating preview...</p>
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
                onEditorReady={onEditorReady}
              />
            )}
        </main>

        <aside className="flex w-72 shrink-0 flex-col border-l border-sidebar-border bg-sidebar">
          <div className="border-b border-sidebar-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
            AI Assistant
          </div>
          <AiSidebar ai={ai} project={selectedProject} />
        </aside>
      </div>
    </div>
  );
}
