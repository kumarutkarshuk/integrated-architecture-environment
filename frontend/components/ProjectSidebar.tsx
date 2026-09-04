"use client";

import { UserButton } from "@clerk/nextjs";
import { useState } from "react";
import type { ApiProject } from "../lib/api";

interface ProjectSidebarProps {
  projects: ApiProject[];
  selectedProjectId: string | null;
  isLoading: boolean;
  error: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (name: string) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
}

export function ProjectSidebar({
  projects,
  selectedProjectId,
  isLoading,
  error,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
}: ProjectSidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleCreateProject() {
    const name = window.prompt("Project name");
    if (!name?.trim()) {
      return;
    }

    setIsCreating(true);
    setActionError(null);

    try {
      await onCreateProject(name.trim());
    } catch (createError) {
      setActionError(
        createError instanceof Error
          ? createError.message
          : "Failed to create project",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteProject(
    event: React.MouseEvent,
    project: ApiProject,
  ) {
    event.stopPropagation();

    const confirmed = window.confirm(`Delete "${project.name}"?`);
    if (!confirmed) {
      return;
    }

    setActionError(null);

    try {
      await onDeleteProject(project.id);
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete project",
      );
    }
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center justify-between border-b border-sidebar-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Projects
        </span>
        <UserButton afterSignOutUrl="/" />
      </div>

      <div className="border-b border-sidebar-border p-2">
        <button
          type="button"
          className="w-full rounded bg-accent px-2 py-1.5 text-sm text-accent-foreground hover:opacity-90 disabled:opacity-50"
          onClick={() => void handleCreateProject()}
          disabled={isCreating}
        >
          {isCreating ? "Creating..." : "New blank project"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <p className="px-2 py-1 text-sm text-muted">Loading projects...</p>
        )}

        {error && <p className="px-2 py-1 text-sm text-red-400">{error}</p>}
        {actionError && (
          <p className="px-2 py-1 text-sm text-red-400">{actionError}</p>
        )}

        {!isLoading && !error && projects.length === 0 && (
          <p className="px-2 py-1 text-sm text-muted">No projects yet</p>
        )}

        <ul className="space-y-1">
          {projects.map((project) => {
            const isSelected = project.id === selectedProjectId;

            return (
              <li key={project.id}>
                <div
                  className={`flex items-center gap-1 rounded ${
                    isSelected ? "bg-hover" : "hover:bg-hover"
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 px-2 py-1.5 text-left text-sm"
                    onClick={() => onSelectProject(project.id)}
                  >
                    <span className="block truncate">{project.name}</span>
                    <span className="block text-xs text-muted">
                      {project.status}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 text-xs text-muted hover:text-red-400"
                    aria-label={`Delete ${project.name}`}
                    onClick={(event) => void handleDeleteProject(event, project)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
