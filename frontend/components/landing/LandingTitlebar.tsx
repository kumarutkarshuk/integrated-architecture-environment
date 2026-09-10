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
        <span className="text-muted/60">/</span>
        <span
          className="flex min-w-0 items-center gap-1 truncate font-medium text-foreground/90"
          title={canvasLabel}
        >
          <Layers className="h-3 w-3 shrink-0 text-accent" />
          <span className="truncate">{canvasLabel}</span>
        </span>
      </div>

      <LandingSourceLinks className="hidden shrink-0 gap-3 font-mono text-[11px] sm:flex" />
    </header>
  );
}
