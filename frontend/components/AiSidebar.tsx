"use client";

import type { ApiProject } from "../lib/api";
import type { useAiGeneration } from "../hooks/useAiGeneration";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Textarea } from "./ui/textarea";

type AiGenerationState = ReturnType<typeof useAiGeneration>;

interface AiSidebarProps {
  project: ApiProject | null;
  ai: AiGenerationState;
}

function formatPreviewTime(createdAt: string): string {
  return new Date(createdAt).toLocaleString();
}

export function AiSidebar({ project, ai }: AiSidebarProps) {
  const {
    prompt,
    setPrompt,
    previews,
    selectedPreviewId,
    setSelectedPreviewId,
    isBusy,
    isGenerating,
    generationFailed,
    error,
    regenerate,
    applySelectedPreview,
  } = ai;

  if (!project) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted">
        Select a project to use AI generation
      </div>
    );
  }

  if (project.mode !== "prompt" || project.status === "ready") {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted">
        Coming in v2
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
      <Card>
        <CardHeader>
          <CardTitle>Prompt</CardTitle>
          <CardDescription>
            Describe the system you want designed. Tweak and regenerate until
            you like a preview.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="ai-prompt">Design prompt</Label>
            <Textarea
              id="ai-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Design a todo API with auth and Postgres"
              disabled={isBusy}
            />
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={isBusy || !prompt.trim() || isGenerating}
            onClick={() => void regenerate()}
          >
            {isGenerating ? "Generating..." : "Regenerate preview"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Previews</CardTitle>
          <CardDescription>
            Pick a completed preview to apply to the canvas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isGenerating && previews.length === 0 && (
            <p className="text-sm text-muted">
              AI is generating your first preview...
            </p>
          )}

          {generationFailed && previews.length === 0 && (
            <p className="text-sm text-red-400">
              Generation failed. Update your prompt and try again.
            </p>
          )}

          {!isGenerating && !generationFailed && previews.length === 0 && (
            <p className="text-sm text-muted">No completed previews yet.</p>
          )}

          {previews.length > 0 && (
            <RadioGroup
              value={selectedPreviewId ?? undefined}
              onValueChange={setSelectedPreviewId}
            >
              {previews.map((preview) => (
                <label
                  key={preview.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-sidebar-border p-3 hover:bg-hover"
                >
                  <RadioGroupItem value={preview.id} className="mt-1" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {preview.prompt ?? "Untitled preview"}
                    </p>
                    <p className="text-xs text-muted">
                      {formatPreviewTime(preview.createdAt)}
                    </p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          )}

          <Button
            type="button"
            className="w-full"
            disabled={isBusy || !selectedPreviewId || isGenerating}
            onClick={() => void applySelectedPreview()}
          >
            Apply selected preview
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
