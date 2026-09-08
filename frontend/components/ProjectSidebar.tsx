"use client";

import { Layers, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage, type ApiProject } from "../lib/api";
import { CollapsibleSidebar } from "./CollapsibleSidebar";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";

interface ProjectSidebarProps {
  projects: ApiProject[];
  selectedProjectId: string | null;
  isLoading: boolean;
  error: string | null;
  currentUserId: string | null;
  isOpen: boolean;
  onToggleOpen: () => void;
  onSelectProject: (projectId: string) => void;
  onRequestCreateBlank: () => void;
  onRequestCreatePrompt: () => void;
  onDeleteProject: (projectId: string) => Promise<void>;
}

export function ProjectSidebar({
  projects,
  selectedProjectId,
  isLoading,
  error,
  currentUserId,
  isOpen,
  onToggleOpen,
  onSelectProject,
  onRequestCreateBlank,
  onRequestCreatePrompt,
  onDeleteProject,
}: ProjectSidebarProps) {
  const [projectPendingDelete, setProjectPendingDelete] =
    useState<ApiProject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function openDeleteDialog(event: React.MouseEvent, project: ApiProject) {
    event.stopPropagation();

    if (currentUserId !== project.ownerId) {
      return;
    }

    setProjectPendingDelete(project);
  }

  function cancelDelete() {
    if (isDeleting) {
      return;
    }

    setProjectPendingDelete(null);
  }

  async function confirmDelete() {
    if (!projectPendingDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      await onDeleteProject(projectPendingDelete.id);
      setProjectPendingDelete(null);
    } catch (deleteError) {
      toast.error(
        apiErrorMessage(deleteError, "Could not delete the Project"),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <CollapsibleSidebar
      title="Projects"
      side="left"
      isOpen={isOpen}
      openWidthClass="w-64"
      onToggleOpen={onToggleOpen}
    >
      <div className="space-y-1.5 border-b border-sidebar-border p-2">
        <Button
          type="button"
          size="sm"
          className="h-8 w-full justify-start gap-2 px-2 font-mono text-xs bg-accent text-white hover:bg-accent/90"
          onClick={onRequestCreateBlank}
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          New blank project
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 w-full justify-start gap-2 px-2 font-mono text-xs border border-sidebar-border bg-hover hover:bg-sidebar"
          onClick={onRequestCreatePrompt}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-sky-400" />
          New prompt project
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs select-none">
        {isLoading && (
          <p className="px-2 py-1 text-xs text-muted">Loading projects...</p>
        )}

        {error && <p className="px-2 py-1 text-xs text-red-400">{error}</p>}

        {!isLoading && !error && projects.length === 0 && (
          <p className="px-2 py-1 text-xs text-muted">No projects yet</p>
        )}

        <ul className="space-y-1">
          {projects.map((project) => {
            const isSelected = project.id === selectedProjectId;
            const canDelete = currentUserId === project.ownerId;
            const meta = `${project.mode} · ${project.status}`;

            return (
              <li key={project.id}>
                <div
                  className={`group relative flex items-center justify-between rounded px-2 py-1.5 transition-colors ${
                    isSelected
                      ? "bg-hover font-medium text-foreground"
                      : "text-foreground/80 hover:bg-hover hover:text-foreground"
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-1 bottom-1 left-0 w-0.5 rounded-r bg-accent" />
                  )}
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                    onClick={() => onSelectProject(project.id)}
                    title={project.name}
                  >
                    {project.mode === "prompt" ? (
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                    ) : (
                      <Layers className="h-3.5 w-3.5 shrink-0 text-accent" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-xs">{project.name}</span>
                      <span className="block truncate text-[10px] text-muted" title={meta}>
                        {meta}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="ml-2 cursor-pointer rounded px-1.5 py-0.5 text-xs text-muted opacity-60 transition-opacity hover:text-red-400 group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-30"
                    aria-label={`Delete ${project.name}`}
                    disabled={!canDelete}
                    onClick={(event) => openDeleteDialog(event, project)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <AlertDialog
        open={projectPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            cancelDelete();
          }
        }}
      >
        <AlertDialogContent className="border-sidebar-border bg-sidebar text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;{projectPendingDelete?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted">
              This cannot be undone. The project will be removed from your
              list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={cancelDelete}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isDeleting}
              onClick={() => void confirmDelete()}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CollapsibleSidebar>
  );
}
