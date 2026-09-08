"use client";

import { Layers } from "lucide-react";
import Link from "next/link";
import { presentShellStatus, type ShellStatus } from "../lib/shellStatus";
import { BadgeGlow } from "./ui/badge-glow";

interface WorkspaceTitlebarProps {
  selectedProjectName: string | null;
  status?: ShellStatus;
}

export function WorkspaceTitlebar({
  selectedProjectName,
  status = "idle",
}: WorkspaceTitlebarProps) {
  const badge = presentShellStatus(status);
  const canvasLabel = selectedProjectName
    ? `${selectedProjectName}.canvas`
    : null;

  return (
    <header className="workspace-titlebar z-20 flex h-9 w-full shrink-0 items-center justify-between border-b border-sidebar-border bg-[#323233] px-3 text-xs select-none">
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
        pulse={badge.pulse}
        className="shrink-0 px-2 py-0.5 text-[10px]"
      >
        {badge.label}
      </BadgeGlow>
    </header>
  );
}
