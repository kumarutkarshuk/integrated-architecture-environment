"use client";

import { useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage } from "../lib/api";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

export type CreateProjectMode = "blank" | "prompt";

interface CreateProjectDialogProps {
  mode: CreateProjectMode | null;
  onClose: () => void;
  onCreateBlankProject: (name: string) => Promise<void>;
  onCreatePromptProject: (name: string, prompt: string) => Promise<void>;
}

export function CreateProjectDialog({
  mode,
  onClose,
  onCreateBlankProject,
  onCreatePromptProject,
}: CreateProjectDialogProps) {
  const [projectName, setProjectName] = useState("");
  const [projectPrompt, setProjectPrompt] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const isPrompt = mode === "prompt";

  function resetAndClose() {
    if (isCreating) {
      return;
    }

    setProjectName("");
    setProjectPrompt("");
    onClose();
  }

  async function handleCreate() {
    if (!mode) {
      return;
    }

    if (isPrompt) {
      if (!projectName.trim() || !projectPrompt.trim()) {
        toast.error("Name and prompt are required");
        return;
      }
    } else if (!projectName.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsCreating(true);

    try {
      const name = projectName.trim();
      if (isPrompt) {
        await onCreatePromptProject(name, projectPrompt.trim());
      } else {
        await onCreateBlankProject(name);
      }
      toast.success(`Created "${name}"`);
      setProjectName("");
      setProjectPrompt("");
      onClose();
    } catch (createError) {
      toast.error(
        apiErrorMessage(createError, "Could not create the Project"),
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Dialog
      open={mode !== null}
      onOpenChange={(open) => {
        if (!open) {
          resetAndClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isPrompt ? "New prompt project" : "New blank project"}
          </DialogTitle>
          <DialogDescription>
            {isPrompt
              ? "Name the project and describe the system you want designed."
              : "Name the project to start a blank canvas."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="create-project-name">Name</Label>
            <Input
              id="create-project-name"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Payment service"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter" && !isPrompt) {
                  event.preventDefault();
                  void handleCreate();
                }
              }}
            />
          </div>

          {isPrompt && (
            <div className="space-y-1">
              <Label htmlFor="create-project-prompt">Prompt</Label>
              <Textarea
                id="create-project-prompt"
                value={projectPrompt}
                onChange={(event) => setProjectPrompt(event.target.value)}
                placeholder="Design a payment flow with Stripe"
                className="min-h-20"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isCreating}
            onClick={resetAndClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isCreating}
            onClick={() => void handleCreate()}
          >
            {isCreating
              ? "Creating..."
              : isPrompt
                ? "Create prompt project"
                : "Create blank project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
