"use client";

import { UserButton } from "@clerk/nextjs";
import type { ApiProject } from "../lib/api";

interface ProjectSidebarProps {
  projects: ApiProject[];
  isLoading: boolean;
  error: string | null;
}

export function ProjectSidebar({
  projects,
  isLoading,
  error,
}: ProjectSidebarProps) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center justify-between border-b border-sidebar-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Projects
        </span>
        <UserButton afterSignOutUrl="/" />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <p className="px-2 py-1 text-sm text-muted">Loading projects...</p>
        )}

        {error && <p className="px-2 py-1 text-sm text-red-400">{error}</p>}

        {!isLoading && !error && projects.length === 0 && (
          <p className="px-2 py-1 text-sm text-muted">No projects yet</p>
        )}

        <ul className="space-y-1">
          {projects.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-hover"
              >
                {project.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
