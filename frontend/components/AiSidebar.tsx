"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useRef, type ReactNode } from "react";
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
  canvasLive?: boolean;
  onAgentAllowedChange: (allowed: boolean) => void;
}

function PanelLoading({ label }: { label: string }) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center p-6 text-center text-xs font-mono"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="text-muted">{label}</p>
    </div>
  );
}

function PreviewReveal({
  itemsKey,
  children,
}: {
  itemsKey: string;
  children: ReactNode;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useStaggerReveal(listRef, {
    itemsKey,
    enabled: true,
    fromX: 10,
    fromY: 16,
    duration: 0.7,
    stagger: 0.14,
    ease: "power3.out",
  });

  return (
    <div
      ref={listRef}
      className="flex min-h-0 flex-1 flex-col font-mono text-xs"
    >
      {children}
    </div>
  );
}

export function AiSidebar({
  project,
  ai,
  agentAllowed,
  canvasLive = true,
  onAgentAllowedChange,
}: AiSidebarProps) {
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
    previewWaitTimedOut,
    isAppliedJobLoading,
    regenerate,
    applySelectedPreview,
  } = ai;

  const showPreviewIteration =
    project != null &&
    ((project.mode === "prompt" && project.status !== "ready") || isApplying);

  const waitingForPreview =
    project?.mode === "prompt" &&
    project.status !== "failed" &&
    !generationFailed &&
    !previewWaitTimedOut &&
    previews.length === 0 &&
    (isGenerating ||
      project.status === "generating" ||
      project.status === "preview");

  if (showPreviewIteration && waitingForPreview) {
    return (
      <PanelLoading
        label={isGenerating ? "Generating preview..." : "Waiting for preview..."}
      />
    );
  }

  if (!showPreviewIteration) {
    if (project?.status === "ready") {
      const ratingPending =
        project.mode === "prompt" && Boolean(isAppliedJobLoading);
      if (!canvasLive || ratingPending) {
        return <PanelLoading label="Loading..." />;
      }

      return (
        <AgentAllowPanel
          key={project.id}
          revealKey={project.id}
          allowed={agentAllowed}
          onAllowedChange={onAgentAllowedChange}
          header={
            appliedJob && hasAuthorRating(appliedJob) ? (
              <RatingButtons
                value={appliedJob.rating}
                caption="Did you like this AI generation?"
                onRate={(value) => {
                  void rateJob(appliedJob.id, value);
                }}
              />
            ) : undefined
          }
        />
      );
    }

    return <AgentAllowEmpty />;
  }

  const canRegenerate =
    !isBusy && !isApplying && !isGenerating && Boolean(prompt.trim());
  const showApply = Boolean(selectedPreviewId) || isApplying;
  const previewIds = previews.map((preview) => preview.id).join("|");

  return (
    <PreviewReveal
      key={project.id}
      itemsKey={`${previewIds}|${showApply ? "apply" : ""}|composer`}
    >
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 overflow-y-auto p-3">
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
          <div data-stagger-item="apply" className="mt-2">
            <Button
              type="button"
              size="sm"
              className="h-7 w-full text-xs"
              disabled={isBusy || isApplying}
              onClick={() => void applySelectedPreview()}
            >
              {isApplying ? "Applying..." : "Apply preview"}
            </Button>
          </div>
        )}
      </div>

      <div
        data-stagger-item="composer"
        className="border-t border-sidebar-border p-2"
      >
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
    </PreviewReveal>
  );
}
