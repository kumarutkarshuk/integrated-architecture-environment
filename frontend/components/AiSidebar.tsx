"use client";

import { Bot, Check, Clock, Layers, Sparkles } from "lucide-react";
import type { ApiProject } from "../lib/api";
import type { useAiGeneration } from "../hooks/useAiGeneration";
import { BorderBeam } from "./ui/border-beam";
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
    regenerate,
    applySelectedPreview,
  } = ai;

  if (!project) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-center text-xs font-mono text-muted">
        Select a project to use AI generation
      </div>
    );
  }

  if (project.mode !== "prompt" || project.status === "ready") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center text-xs font-mono text-muted">
        <Bot className="h-8 w-8 text-muted/50" />
        <p>Coming in v2</p>
        <p className="text-[10px] text-muted/70">
          AI chat-assisted canvas modifications will arrive in the next release.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3 font-mono text-xs">
      {/* Copilot Prompt Card */}
      <Card className="relative overflow-hidden border-sidebar-border bg-sidebar/90">
        {isGenerating && (
          <BorderBeam
            size={180}
            duration={8}
            colorFrom="#007acc"
            colorTo="#38bdf8"
            borderWidth={1.5}
          />
        )}
        <CardHeader className="pb-2">
          <div className="flex items-center gap-1.5 text-accent font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <CardTitle className="text-xs">Prompt</CardTitle>
          </div>
          <CardDescription className="text-[11px] text-muted">
            Describe the system you want designed. Tweak and regenerate until
            you like a preview.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="ai-prompt" className="text-[11px] text-muted">
                Design prompt
              </Label>
              <kbd className="text-[9px] text-muted/70 rounded bg-hover px-1 py-0.5">
                ⌘↵
              </kbd>
            </div>
            <Textarea
              id="ai-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Design a todo API with auth and Postgres"
              disabled={isBusy}
              className="text-xs min-h-20 bg-panel border-sidebar-border focus-visible:ring-accent"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  if (!isBusy && prompt.trim() && !isGenerating) {
                    void regenerate();
                  }
                }
              }}
            />
          </div>
          <Button
            type="button"
            className="w-full text-xs h-8 bg-accent hover:bg-accent/90 text-white font-mono"
            disabled={isBusy || !prompt.trim() || isGenerating}
            onClick={() => void regenerate()}
          >
            {isGenerating ? (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                Generating...
              </span>
            ) : (
              "Regenerate preview"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Previews Selection Card */}
      <Card className="border-sidebar-border bg-sidebar/90">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-1.5 text-foreground font-semibold">
            <Layers className="h-3.5 w-3.5 text-muted" />
            <CardTitle className="text-xs">Previews</CardTitle>
          </div>
          <CardDescription className="text-[11px] text-muted">
            Pick a completed preview to apply to the canvas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isGenerating && previews.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-sky-400 py-1">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
              <p>AI is generating your first preview...</p>
            </div>
          )}

          {generationFailed && previews.length === 0 && (
            <p className="text-xs text-red-400">
              Generation failed. Update your prompt and try again.
            </p>
          )}

          {!isGenerating && !generationFailed && previews.length === 0 && (
            <p className="text-xs text-muted">No completed previews yet.</p>
          )}

          {previews.length > 0 && (
            <RadioGroup
              value={selectedPreviewId ?? undefined}
              onValueChange={setSelectedPreviewId}
              className="space-y-1.5"
            >
              {previews.map((preview) => {
                const isSelected = selectedPreviewId === preview.id;
                return (
                  <label
                    key={preview.id}
                    className={`flex cursor-pointer items-start gap-2.5 rounded border p-2.5 transition-colors ${
                      isSelected
                        ? "border-accent bg-hover/80 text-foreground"
                        : "border-sidebar-border bg-panel hover:bg-hover text-foreground/80"
                    }`}
                  >
                    <RadioGroupItem value={preview.id} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p
                        className="line-clamp-2 text-xs font-medium leading-snug"
                        title={preview.prompt ?? "Untitled preview"}
                      >
                        {preview.prompt ?? "Untitled preview"}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-muted">
                        <Clock className="h-2.5 w-2.5" />
                        {formatPreviewTime(preview.createdAt)}
                      </p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          )}

          <Button
            type="button"
            className="w-full text-xs h-8 font-mono"
            variant={selectedPreviewId ? "default" : "secondary"}
            disabled={isBusy || !selectedPreviewId || isGenerating}
            onClick={() => void applySelectedPreview()}
          >
            Apply selected preview
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
