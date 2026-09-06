"use client";

import { UserButton } from "@clerk/nextjs";
import { useState } from "react";
import type { ApiProject } from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface ProjectSidebarProps {
  projects: ApiProject[];
  selectedProjectId: string | null;
  isLoading: boolean;
  error: string | null;
  currentUserId: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateBlankProject: (name: string) => Promise<void>;
  onCreatePromptProject: (name: string, prompt: string) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
}

export function ProjectSidebar({
  projects,
  selectedProjectId,
  isLoading,
  error,
  currentUserId,
  onSelectProject,
  onCreateBlankProject,
  onCreatePromptProject,
  onDeleteProject,
}: ProjectSidebarProps) {
  const [isCreatingBlank, setIsCreatingBlank] = useState(false);
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);
  const [showPromptForm, setShowPromptForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectPrompt, setProjectPrompt] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleCreateBlankProject() {
    const name = window.prompt("Project name");
    if (!name?.trim()) {
      return;
    }

    setIsCreatingBlank(true);
    setActionError(null);

    try {
      await onCreateBlankProject(name.trim());
    } catch (createError) {
      setActionError(
        createError instanceof Error
          ? createError.message
          : "Failed to create project",
      );
    } finally {
      setIsCreatingBlank(false);
    }
  }

  async function handleCreatePromptProject() {
    if (!projectName.trim() || !projectPrompt.trim()) {
      setActionError("Name and prompt are required");
      return;
    }

    setIsCreatingPrompt(true);
    setActionError(null);

    try {
      await onCreatePromptProject(projectName.trim(), projectPrompt.trim());
      setShowPromptForm(false);
      setProjectName("");
      setProjectPrompt("");
    } catch (createError) {
      setActionError(
        createError instanceof Error
          ? createError.message
          : "Failed to create prompt project",
      );
    } finally {
      setIsCreatingPrompt(false);
    }
  }

  async function handleDeleteProject(
    event: React.MouseEvent,
    project: ApiProject,
  ) {
    event.stopPropagation();

    if (currentUserId !== project.ownerId) {
      return;
    }

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

      <div className="space-y-2 border-b border-sidebar-border p-2">
        <Button
          type="button"
          className="w-full"
          disabled={isCreatingBlank}
          onClick={() => void handleCreateBlankProject()}
        >
          {isCreatingBlank ? "Creating..." : "New blank project"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => setShowPromptForm((current) => !current)}
        >
          {showPromptForm ? "Cancel prompt project" : "New prompt project"}
        </Button>

        {showPromptForm && (
          <div className="space-y-2 rounded-md border border-sidebar-border p-2">
            <div className="space-y-1">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Payment service"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="project-prompt">Prompt</Label>
              <Textarea
                id="project-prompt"
                value={projectPrompt}
                onChange={(event) => setProjectPrompt(event.target.value)}
                placeholder="Design a payment flow with Stripe"
              />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={isCreatingPrompt}
              onClick={() => void handleCreatePromptProject()}
            >
              {isCreatingPrompt ? "Creating..." : "Create prompt project"}
            </Button>
          </div>
        )}
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
            const canDelete = currentUserId === project.ownerId;

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
                      {project.mode} · {project.status}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 text-xs text-muted hover:text-red-400 disabled:pointer-events-none disabled:opacity-40"
                    aria-label={`Delete ${project.name}`}
                    disabled={!canDelete}
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
