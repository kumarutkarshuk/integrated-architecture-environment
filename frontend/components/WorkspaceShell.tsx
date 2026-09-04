"use client";

import { useCurrentUser } from "../hooks/useCurrentUser";
import { useProjects } from "../hooks/useProjects";
import { ProjectSidebar } from "./ProjectSidebar";

export function WorkspaceShell() {
  const { user, isLoading: isUserLoading, error: userError } = useCurrentUser();
  const {
    projects,
    isLoading: isProjectsLoading,
    error: projectsError,
  } = useProjects(Boolean(user));

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-9 items-center border-b border-sidebar-border bg-titlebar px-3 text-sm">
        <span className="font-medium">Integrated Architecture Environment</span>
        {user && (
          <span className="ml-3 text-muted">
            {user.displayName ?? user.email}
          </span>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <ProjectSidebar
          projects={projects}
          isLoading={isUserLoading || isProjectsLoading}
          error={userError ?? projectsError}
        />

        <main className="flex min-w-0 flex-1 flex-col bg-panel">
          <div className="flex h-9 items-center border-b border-sidebar-border px-3 text-xs text-muted">
            Canvas
          </div>
          <div className="flex flex-1 items-center justify-center text-sm text-muted">
            Select or create a project to start designing
          </div>
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
