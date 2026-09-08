"use client";

import { UserButton } from "@clerk/nextjs";
import { useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage, type ApiProject } from "../lib/api";
import { clerkAppearance } from "../lib/clerkAppearance";
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
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface ProjectSidebarProps {
  projects: ApiProject[];
  selectedProjectId: string | null;
  isLoading: boolean;
  error: string | null;
  currentUserId: string | null;
  isOpen: boolean;
  width?: number;
  onStartResize?: (side: "left" | "right", clientX: number) => void;
  onToggleOpen: () => void;
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
  isOpen,
  width,
  onStartResize,
  onToggleOpen,
  onSelectProject,
  onCreateBlankProject,
  onCreatePromptProject,
  onDeleteProject,
}: ProjectSidebarProps) {
  const [isCreatingBlank, setIsCreatingBlank] = useState(false);
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);
  const [showBlankForm, setShowBlankForm] = useState(false);
  const [showPromptForm, setShowPromptForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectPrompt, setProjectPrompt] = useState("");
  const [projectPendingDelete, setProjectPendingDelete] =
    useState<ApiProject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function toggleBlankForm() {
    setShowBlankForm((current) => !current);
    setShowPromptForm(false);
  }

  function togglePromptForm() {
    setShowPromptForm((current) => !current);
    setShowBlankForm(false);
  }

  async function handleCreateBlankProject() {
    if (!projectName.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsCreatingBlank(true);

    try {
      const name = projectName.trim();
      await onCreateBlankProject(name);
      toast.success(`Created "${name}"`);
      setShowBlankForm(false);
      setProjectName("");
    } catch (createError) {
      toast.error(
        apiErrorMessage(createError, "Could not create the Project"),
      );
    } finally {
      setIsCreatingBlank(false);
    }
  }

  async function handleCreatePromptProject() {
    if (!projectName.trim() || !projectPrompt.trim()) {
      toast.error("Name and prompt are required");
      return;
    }

    setIsCreatingPrompt(true);

    try {
      const name = projectName.trim();
      await onCreatePromptProject(name, projectPrompt.trim());
      toast.success(`Created "${name}"`);
      setShowPromptForm(false);
      setProjectName("");
      setProjectPrompt("");
    } catch (createError) {
      toast.error(
        apiErrorMessage(createError, "Could not create the Project"),
      );
    } finally {
      setIsCreatingPrompt(false);
    }
  }

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
      width={width}
      onStartResize={onStartResize}
      onToggleOpen={onToggleOpen}
      headerEnd={
        <UserButton appearance={clerkAppearance} afterSignOutUrl="/" />
      }
    >
      <div className="space-y-2 border-b border-sidebar-border p-2">
        <Button
          type="button"
          className="w-full"
          onClick={toggleBlankForm}
        >
          {showBlankForm ? "Cancel blank project" : "New blank project"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={togglePromptForm}
        >
          {showPromptForm ? "Cancel prompt project" : "New prompt project"}
        </Button>

        {showBlankForm && (
          <div className="space-y-2 rounded-md border border-sidebar-border p-2">
            <div className="space-y-1">
              <Label htmlFor="blank-project-name">Name</Label>
              <Input
                id="blank-project-name"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Payment service"
              />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={isCreatingBlank}
              onClick={() => void handleCreateBlankProject()}
            >
              {isCreatingBlank ? "Creating..." : "Create blank project"}
            </Button>
          </div>
        )}

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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;{projectPendingDelete?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
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
