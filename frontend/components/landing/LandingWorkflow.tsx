"use client";

import { Bot, FileDown, PenLine, Sparkles } from "lucide-react";

const AI_MOVES = [
  {
    id: "prompt",
    title: "Prompt",
    detail: "Describe the system. AI draws nodes and message paths on the canvas.",
    icon: Sparkles,
  },
  {
    id: "draw",
    title: "Draw",
    detail: "Edit the live canvas with teammates. Specs stay in sync with the graph.",
    icon: PenLine,
  },
  {
    id: "export",
    title: "Export",
    detail: "Download a markdown spec ready for review and pull requests.",
    icon: FileDown,
  },
] as const;

export function LandingWorkflow() {
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3 font-mono text-xs">
      <div className="flex flex-col items-center gap-2 px-2 py-3 text-center text-muted">
        <Bot className="h-7 w-7 text-muted/50" />
        <p className="font-medium text-foreground">AI topology</p>
        <p className="text-[11px] leading-relaxed text-muted">
          Prompt a graph, tweak it live, then export a spec.
        </p>
      </div>

      {AI_MOVES.map((move) => {
        const Icon = move.icon;
        return (
          <div
            key={move.id}
            title={move.detail}
            className="rounded-lg border border-sidebar-border bg-sidebar/70 p-3"
          >
            <div className="flex items-center gap-1.5 font-semibold text-accent">
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{move.title}</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
              {move.detail}
            </p>
          </div>
        );
      })}
    </div>
  );
}
