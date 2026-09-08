"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface BadgeGlowProps {
  children: React.ReactNode;
  className?: string;
  dotColor?: string;
}

export function BadgeGlow({
  children,
  className,
  dotColor = "bg-emerald-400",
}: BadgeGlowProps) {
  return (
    <div
      className={cn(
        "group relative inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-sidebar/80 px-3 py-1 text-xs text-foreground shadow-sm backdrop-blur-md transition-all duration-300 hover:border-accent/40 hover:bg-hover",
        className,
      )}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            dotColor,
          )}
        />
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            dotColor,
          )}
        />
      </span>
      <span className="font-mono text-[11px] tracking-tight">{children}</span>
    </div>
  );
}
