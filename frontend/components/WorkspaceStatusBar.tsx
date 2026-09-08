"use client";

import { Users } from "lucide-react";
import { presentShellStatus, type ShellStatus } from "../lib/shellStatus";

interface WorkspaceStatusBarProps {
  status?: ShellStatus;
  collaboratorCount?: number;
  projectName?: string | null;
}

export function WorkspaceStatusBar({
  status = "idle",
  collaboratorCount = 0,
  projectName,
}: WorkspaceStatusBarProps) {
  const { dotColor, label } = presentShellStatus(status);
  const canvasLabel = projectName ? `${projectName}.canvas` : null;

  return (
    <footer
      className="workspace-statusbar z-20 flex h-5.5 w-full shrink-0 items-center justify-between border-t border-sidebar-border bg-[#181818] px-3 font-mono text-[11px] text-muted select-none"
      aria-label="Status Bar"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
        <span className="text-foreground/90">{label}</span>
        {canvasLabel && (
          <>
            <span className="text-muted/40">•</span>
            <span className="max-w-xs truncate" title={canvasLabel}>
              {canvasLabel}
            </span>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Users className="h-3 w-3 text-muted" />
        <span>
          {collaboratorCount > 0
            ? `${collaboratorCount} collaborator${collaboratorCount > 1 ? "s" : ""}`
            : "Solo session"}
        </span>
      </div>
    </footer>
  );
}
