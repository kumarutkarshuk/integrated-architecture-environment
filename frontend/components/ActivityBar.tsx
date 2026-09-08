"use client";

import {
  FileText,
  FolderGit2,
  FolderPlus,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";

interface ActivityBarProps {
  isProjectsOpen: boolean;
  isAiOpen: boolean;
  onToggleProjects: () => void;
  onToggleAi: () => void;
  onNewProject?: () => void;
  onExportSpec?: () => void;
  canExportSpec?: boolean;
  accountSlot?: ReactNode;
}

export function ActivityBar({
  isProjectsOpen,
  isAiOpen,
  onToggleProjects,
  onToggleAi,
  onNewProject,
  onExportSpec,
  canExportSpec = true,
  accountSlot,
}: ActivityBarProps) {
  return (
    <nav
      aria-label="Activity Bar"
      className="flex h-full w-12 shrink-0 flex-col items-center justify-between border-r border-sidebar-border bg-[#181818] py-2 select-none"
    >
      {/* Top action items */}
      <div className="flex w-full flex-col items-center gap-1">
        {/* Explorer / Projects toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Explorer"
              title="Explorer (Projects)"
              aria-pressed={isProjectsOpen}
              onClick={onToggleProjects}
              className={`relative flex h-11 w-full items-center justify-center transition-colors ${
                isProjectsOpen
                  ? "border-l-2 border-white text-foreground"
                  : "border-l-2 border-transparent text-muted hover:text-foreground"
              }`}
            >
              <FolderGit2 className="size-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Explorer (Projects)</TooltipContent>
        </Tooltip>

        {/* AI Assistant toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="AI Assistant"
              title="AI Assistant"
              aria-pressed={isAiOpen}
              onClick={onToggleAi}
              className={`relative flex h-11 w-full items-center justify-center transition-colors ${
                isAiOpen
                  ? "border-l-2 border-purple-400 text-purple-300"
                  : "border-l-2 border-transparent text-muted hover:text-foreground"
              }`}
            >
              <Sparkles className="size-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">AI Assistant</TooltipContent>
        </Tooltip>

        <div className="my-1.5 h-px w-6 bg-sidebar-border" />

        {/* Explorer Tool: New Project */}
        {onNewProject && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="New Project"
                title="New Project"
                onClick={onNewProject}
                className="flex h-10 w-full items-center justify-center border-l-2 border-transparent text-muted transition-colors hover:text-foreground"
              >
                <FolderPlus className="size-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">New Project</TooltipContent>
          </Tooltip>
        )}

        {/* Explorer Tool: Export Architecture Spec */}
        {onExportSpec && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Export Architecture Spec"
                title="Export Architecture Spec"
                disabled={!canExportSpec}
                onClick={onExportSpec}
                className="flex h-10 w-full items-center justify-center border-l-2 border-transparent text-muted transition-colors hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
              >
                <FileText className="size-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Export Architecture Spec</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Bottom action items */}
      <div className="flex w-full flex-col items-center gap-2 pb-1">
        {accountSlot && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                title="Accounts"
                aria-label="Accounts"
                className="flex items-center justify-center"
              >
                {accountSlot}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Accounts</TooltipContent>
          </Tooltip>
        )}
      </div>
    </nav>
  );
}
