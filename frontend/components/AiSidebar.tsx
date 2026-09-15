"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useRef } from "react";
import type { ApiProject } from "../lib/api";
import { hasAuthorRating } from "../lib/api";
import type { useAiGeneration } from "../hooks/useAiGeneration";
import { useStaggerReveal } from "../hooks/useStaggerReveal";
import { AgentAllowEmpty, AgentAllowPanel } from "./AgentAllowPanel";
import { RatingButtons } from "./RatingButtons";
import { BorderBeam } from "./ui/border-beam";
import { Button } from "./ui/button";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Textarea } from "./ui/textarea";
import { cn } from "@/lib/utils";

type AiGenerationState = ReturnType<typeof useAiGeneration>;

interface AiSidebarProps {
  project: ApiProject | null;
  ai: AiGenerationState;
  agentAllowed: boolean;
  onAgentAllowedChange: (allowed: boolean) => void;
}

export function AiSidebar({
  project,
  ai,
  agentAllowed,
  onAgentAllowedChange,
}: AiSidebarProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const {
    prompt,
    setPrompt,
    previews,
    selectedPreviewId,
    setSelectedPreviewId,
    appliedJob,
    rateJob,
    isBusy,
    isApplying,
    isGenerating,
    generationFailed,
    generationError,
    regenerate,
    applySelectedPreview,
  } = ai;

  const previewIds = previews.map((preview) => preview.id).join("|");
  useStaggerReveal(listRef, {
    itemsKey: `${previewIds}|${selectedPreviewId ? "apply" : ""}`,
    enabled: previews.length > 0,
    fromX: 8,
    fromY: 8,
  });

  const showPreviewIteration =
    project != null &&
    ((project.mode === "prompt" && project.status !== "ready") || isApplying);

  if (!showPreviewIteration) {
    if (project?.status === "ready") {
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          {appliedJob && hasAuthorRating(appliedJob) ? (
            <div className="border-b border-sidebar-border px-3 py-2">
              <RatingButtons
                value={appliedJob.rating}
                caption="Did you like this AI generation?"
                onRate={(value) => {
                  void rateJob(appliedJob.id, value);
                }}
              />
            </div>
          ) : null}
          <AgentAllowPanel
            allowed={agentAllowed}
            onAllowedChange={onAgentAllowedChange}
          />
        </div>
      );
    }

    return <AgentAllowEmpty />;
  }

  const canRegenerate =
    !isBusy && !isApplying && !isGenerating && Boolean(prompt.trim());
  const showApply = Boolean(selectedPreviewId) || isApplying;

  return (
    <div className="flex min-h-0 flex-1 flex-col font-mono text-xs">
      <div
        ref={listRef}
        className="flex min-h-0 flex-1 flex-col justify-end gap-2 overflow-y-auto p-3"
      >
        {previews.length > 0 && (
          <RadioGroup
            value={selectedPreviewId ?? undefined}
            onValueChange={(value) => {
              if (isApplying) {
                return;
              }
              setSelectedPreviewId(value);
            }}
            className="space-y-1.5"
          >
            {previews.map((preview) => {
              const isSelected = selectedPreviewId === preview.id;
              return (
                <label
                  key={preview.id}
                  data-stagger-item={preview.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg border p-2 transition-colors",
                    isApplying && "pointer-events-none opacity-80",
                    isSelected
                      ? "border-accent/70 bg-selection/40 text-foreground"
                      : "border-sidebar-border bg-panel text-foreground/80 hover:bg-hover",
                  )}
                >
                  <RadioGroupItem value={preview.id} className="sr-only" />
                  <p
                    className="line-clamp-2 min-w-0 flex-1 text-xs leading-snug"
                    title={preview.prompt ?? "Untitled preview"}
                  >
                    {preview.prompt ?? "Untitled preview"}
                  </p>
                  {hasAuthorRating(preview) ? (
                    <RatingButtons
                      value={preview.rating}
                      disabled={isApplying}
                      onRate={(value) => {
                        void rateJob(preview.id, value);
                      }}
                    />
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 shrink-0 p-0 text-muted hover:text-foreground"
                    disabled={!preview.prompt || isApplying}
                    aria-label="Add prompt to the text box"
                    title="Add prompt to the text box"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (preview.prompt) {
                        setPrompt(preview.prompt);
                      }
                    }}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </label>
              );
            })}
          </RadioGroup>
        )}

        {showApply && (
          <Button
            type="button"
            size="sm"
            className="mt-2 h-7 w-full text-xs"
            data-stagger-item="apply"
            disabled={isBusy || isApplying}
            onClick={() => void applySelectedPreview()}
          >
            {isApplying ? "Applying..." : "Apply preview"}
          </Button>
        )}
      </div>

      <div className="border-t border-sidebar-border p-2">
        {isGenerating ? null : generationError ? (
          <p className="mb-2 text-xs text-red-400">{generationError}</p>
        ) : generationFailed ? (
          <p className="mb-2 text-xs text-muted">Loading reason...</p>
        ) : null}
        <div className="relative overflow-hidden rounded-lg border border-sidebar-border bg-panel">
          {isGenerating && <BorderBeam duration={8} borderWidth={1.5} />}
          <Textarea
            id="ai-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe the system..."
            disabled={isBusy || isApplying || isGenerating}
            className="relative min-h-20 resize-none border-0 bg-transparent px-2.5 py-2 text-[11px] leading-relaxed shadow-none focus-visible:ring-0"
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                if (canRegenerate) {
                  void regenerate();
                }
              }
            }}
          />
          <div className="relative flex justify-end border-t border-sidebar-border p-1.5">
            <Button
              type="button"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={!canRegenerate}
              onClick={() => void regenerate()}
              aria-label="Regenerate preview"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
