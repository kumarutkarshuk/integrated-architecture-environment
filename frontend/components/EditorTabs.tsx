"use client";

import { LayoutGrid, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export type EditorTabMode = "canvas" | "preview";

interface EditorTabsProps {
  activeTab: EditorTabMode;
  onSelectTab: (tab: EditorTabMode) => void;
  isProjectReady: boolean;
  projectName?: string | null;
  actions?: ReactNode;
}

export function EditorTabs({
  activeTab,
  onSelectTab,
  isProjectReady,
  projectName,
  actions,
}: EditorTabsProps) {
  return (
    <div className="flex h-9 w-full items-center justify-between border-b border-sidebar-border bg-[#181818] text-xs select-none">
      {/* Tab strip */}
      <div role="tablist" aria-label="Editor tabs" className="flex h-full items-center">
        {/* Live Canvas Tab */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "canvas"}
          aria-label="Live Canvas Tab"
          onClick={() => onSelectTab("canvas")}
          className={`flex h-full items-center gap-2 border-r border-sidebar-border px-3.5 transition-colors ${
            activeTab === "canvas"
              ? "border-t-2 border-t-accent bg-panel font-medium text-foreground"
              : "border-t-2 border-t-transparent bg-transparent text-muted hover:bg-[#252526] hover:text-foreground"
          }`}
        >
          <LayoutGrid
            className={`size-3.5 ${
              activeTab === "canvas" ? "text-accent" : "text-muted"
            }`}
          />
          <span>{projectName ? `${projectName}.canvas` : "Live Canvas"}</span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
              isProjectReady
                ? "border border-emerald-500/25 bg-emerald-500/15 text-emerald-400"
                : "border border-zinc-700 bg-zinc-800 text-zinc-400"
            }`}
          >
            {isProjectReady ? "Live" : "Locked"}
          </span>
        </button>

        {/* AI Proposal Preview Tab */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "preview"}
          aria-label="AI Preview Tab"
          onClick={() => onSelectTab("preview")}
          className={`flex h-full items-center gap-2 border-r border-sidebar-border px-3.5 transition-colors ${
            activeTab === "preview"
              ? "border-t-2 border-t-purple-500 bg-panel font-medium text-foreground"
              : "border-t-2 border-t-transparent bg-transparent text-muted hover:bg-[#252526] hover:text-foreground"
          }`}
        >
          <Sparkles
            className={`size-3.5 ${
              activeTab === "preview" ? "text-purple-400" : "text-muted"
            }`}
          />
          <span>AI Preview</span>
          <span className="rounded border border-purple-500/25 bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-medium text-purple-300">
            AI Proposal
          </span>
        </button>
      </div>

      {/* Editor actions (Invite, Export Spec, etc.) */}
      {actions && (
        <div className="flex items-center gap-2 px-3">{actions}</div>
      )}
    </div>
  );
}
