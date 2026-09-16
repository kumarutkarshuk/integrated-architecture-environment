"use client";

import { Layers } from "lucide-react";
import Link from "next/link";
import { LandingSourceLinks } from "./LandingSourceLinks";

interface LandingTitlebarProps {
  canvasLabel: string;
}

export function LandingTitlebar({ canvasLabel }: LandingTitlebarProps) {
  return (
    <header className="workspace-titlebar z-20 flex h-9 w-full shrink-0 items-center justify-between border-b border-sidebar-border bg-[#323233] px-3 text-xs select-none">
      <div className="flex min-w-0 items-center gap-2 font-mono text-[11px]">
        <Link
          href="/"
          className="cursor-pointer font-semibold text-accent hover:underline"
          title="Landing page"
        >
          IAE
        </Link>
        <span className="hidden text-muted/60 sm:inline">/</span>
        <span
          className="hidden min-w-0 items-center gap-1 truncate font-medium text-foreground/90 sm:flex"
          title={canvasLabel}
        >
          <Layers className="h-3 w-3 shrink-0 text-accent" />
          <span className="truncate">{canvasLabel}</span>
        </span>
      </div>

      <LandingSourceLinks className="shrink-0 gap-2 font-mono text-[11px] sm:gap-3" />
    </header>
  );
}
