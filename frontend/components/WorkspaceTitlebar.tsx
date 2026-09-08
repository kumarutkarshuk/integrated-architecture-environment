"use client";

import { Layers } from "lucide-react";
import Link from "next/link";
import { BadgeGlow } from "./ui/badge-glow";

export type CrdtBadgeStatus = "live" | "connecting" | "offline" | "idle";

interface WorkspaceTitlebarProps {
  selectedProjectName: string | null;
  crdtStatus?: CrdtBadgeStatus;
}

export function WorkspaceTitlebar({
  selectedProjectName,
  crdtStatus = "idle",
}: WorkspaceTitlebarProps) {
  const badge = crdtBadge(crdtStatus);
  const canvasLabel = selectedProjectName
    ? `${selectedProjectName}.canvas`
    : null;

  return (
    <header className="workspace-titlebar flex h-9 w-full shrink-0 items-center justify-between border-b border-sidebar-border bg-[#323233] px-3 text-xs select-none z-20">
      <div className="flex min-w-0 items-center gap-2 font-mono text-[11px]">
        <Link
          href="/"
          className="cursor-pointer font-semibold text-accent hover:underline"
          title="Return to landing page"
        >
          IAE
        </Link>
        {canvasLabel && (
          <>
            <span className="text-muted/60">/</span>
            <span
              className="flex min-w-0 items-center gap-1 truncate font-medium text-foreground/90"
              title={canvasLabel}
            >
              <Layers className="h-3 w-3 shrink-0 text-accent" />
              <span className="truncate">{canvasLabel}</span>
            </span>
          </>
        )}
      </div>

      <BadgeGlow
        dotColor={badge.dotColor}
        pulse={crdtStatus === "live" || crdtStatus === "connecting"}
        className="shrink-0 px-2 py-0.5 text-[10px]"
      >
        {badge.label}
      </BadgeGlow>
    </header>
  );
}

function crdtBadge(status: CrdtBadgeStatus): {
  label: string;
  dotColor: string;
} {
  if (status === "live") {
    return { label: "CRDT Live", dotColor: "bg-emerald-400" };
  }

  if (status === "connecting") {
    return { label: "Connecting", dotColor: "bg-amber-400" };
  }

  if (status === "offline") {
    return { label: "Offline", dotColor: "bg-amber-400" };
  }

  return { label: "Idle", dotColor: "bg-muted" };
}
