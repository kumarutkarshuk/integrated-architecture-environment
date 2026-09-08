"use client";

import { UserButton } from "@clerk/nextjs";
import { Files, Sparkles } from "lucide-react";
import { clerkAppearance } from "../lib/clerkAppearance";

interface ActivityBarProps {
  isProjectsOpen: boolean;
  onToggleProjects: () => void;
  isAiOpen: boolean;
  onToggleAi: () => void;
}

export function ActivityBar({
  isProjectsOpen,
  onToggleProjects,
  isAiOpen,
  onToggleAi,
}: ActivityBarProps) {
  return (
    <aside
      className="activity-bar flex h-full w-12 shrink-0 flex-col justify-between border-r border-sidebar-border bg-[#181818] py-2 select-none z-10"
      aria-label="Activity Bar"
    >
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleProjects}
          title="Projects"
          aria-label="Explorer View"
          className={`activity-bar-item group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded transition-colors ${
            isProjectsOpen
              ? "text-foreground bg-hover/40"
              : "text-muted hover:text-foreground hover:bg-hover/50"
          }`}
        >
          {isProjectsOpen && (
            <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-accent" />
          )}
          <Files className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onToggleAi}
          title="AI Assistant"
          aria-label="AI Assistant View"
          className={`activity-bar-item group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded transition-colors ${
            isAiOpen
              ? "text-foreground bg-hover/40"
              : "text-muted hover:text-foreground hover:bg-hover/50"
          }`}
        >
          {isAiOpen && (
            <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-accent" />
          )}
          <Sparkles className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-col items-center">
        <div
          className="activity-bar-item flex h-10 w-10 items-center justify-center"
          title="Account"
        >
          <UserButton
            appearance={{
              ...clerkAppearance,
              elements: {
                avatarBox: "h-7 w-7 cursor-pointer",
              },
            }}
            afterSignOutUrl="/"
          />
        </div>
      </div>
    </aside>
  );
}
