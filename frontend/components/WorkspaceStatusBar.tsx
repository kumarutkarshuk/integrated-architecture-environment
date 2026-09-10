"use client";

import { Users } from "lucide-react";

interface WorkspaceStatusBarProps {
  projectName?: string | null;
}

export function WorkspaceStatusBar({ projectName }: WorkspaceStatusBarProps) {
  const canvasLabel = projectName ? `${projectName}.canvas` : null;

  return (
    <footer
      className="workspace-statusbar z-20 flex h-5.5 w-full shrink-0 items-center justify-between border-t border-sidebar-border bg-[#181818] px-3 font-mono text-[11px] text-muted select-none"
      aria-label="Status Bar"
    >
      <div className="flex min-w-0 items-center gap-2">
        {canvasLabel && (
          <span className="max-w-xs truncate" title={canvasLabel}>
            {canvasLabel}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Users className="h-3 w-3 text-muted" />
        <span>Solo session</span>
      </div>
    </footer>
  );
}
