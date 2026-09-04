"use client";

import { useMemo, useState } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useProjects } from "../hooks/useProjects";
import { useYjsTldrawStore } from "../hooks/useYjsTldrawStore";
import { ProjectCanvas } from "./ProjectCanvas";
import { ProjectSidebar } from "./ProjectSidebar";

export function WorkspaceShell() {
  const { user, isLoading: isUserLoading, error: userError } = useCurrentUser();
  const {
    projects,
    isLoading: isProjectsLoading,
    error: projectsError,
    createBlankProject,
    removeProject,
  } = useProjects(Boolean(user));
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const canvasEnabled =
    Boolean(selectedProject) && selectedProject?.status === "ready";
  const storeWithStatus = useYjsTldrawStore(
    selectedProject?.id ?? null,
    canvasEnabled,
  );

  async function handleCreateProject(name: string) {
    const project = await createBlankProject(name);
    setSelectedProjectId(project.id);
  }

  async function handleDeleteProject(projectId: string) {
    await removeProject(projectId);
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
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
        />

        <main className="flex min-w-0 flex-1 flex-col bg-panel">
          <div className="flex h-9 items-center border-b border-sidebar-border px-3 text-xs text-muted">
            Canvas
          </div>

          {!selectedProject && (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">
              Select or create a project to start designing
            </div>
          )}

          {selectedProject && selectedProject.status !== "ready" && (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">
              Canvas is locked while this project is {selectedProject.status}
            </div>
          )}

          {selectedProject &&
            selectedProject.status === "ready" &&
            storeWithStatus && (
              <ProjectCanvas
                projectName={selectedProject.name}
                storeWithStatus={storeWithStatus}
              />
            )}
        </main>

        <aside className="flex w-72 shrink-0 flex-col border-l border-sidebar-border bg-sidebar">
          <div className="border-b border-sidebar-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
            AI Assistant
          </div>
          <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted">
            Coming in v2
          </div>
        </aside>
      </div>
    </div>
  );
}
