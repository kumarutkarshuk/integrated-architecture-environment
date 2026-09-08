"use client";

import { Users } from "lucide-react";
import type { CanvasSaveStatus } from "../hooks/useYjsTldrawStore";

export type WorkspaceStatusKind =
  | CanvasSaveStatus
  | "idle"
  | "preview"
  | "generating";

interface WorkspaceStatusBarProps {
  status?: WorkspaceStatusKind;
  collaboratorCount?: number;
  projectName?: string | null;
}

export function WorkspaceStatusBar({
  status = "idle",
  collaboratorCount = 0,
  projectName,
}: WorkspaceStatusBarProps) {
  const { dotColor, label } = statusPresentation(status);
  const canvasLabel = projectName ? `${projectName}.canvas` : null;

  return (
    <footer
      className="workspace-statusbar flex h-5.5 w-full shrink-0 items-center justify-between border-t border-sidebar-border bg-[#181818] px-3 text-[11px] font-mono text-muted select-none z-20"
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

function statusPresentation(status: WorkspaceStatusKind): {
  dotColor: string;
  label: string;
} {
  switch (status) {
    case "saved":
      return { dotColor: "bg-emerald-400", label: "Saved" };
    case "saving":
      return { dotColor: "bg-amber-400 animate-pulse", label: "Saving" };
    case "offline":
      return { dotColor: "bg-amber-500", label: "Offline" };
    case "error":
      return { dotColor: "bg-red-400", label: "Error" };
    case "preview":
      return { dotColor: "bg-sky-400", label: "Preview" };
    case "generating":
      return { dotColor: "bg-sky-400 animate-pulse", label: "Generating" };
    case "loading":
      return { dotColor: "bg-muted animate-pulse", label: "Loading" };
    default:
      return { dotColor: "bg-muted", label: "Idle" };
  }
}
