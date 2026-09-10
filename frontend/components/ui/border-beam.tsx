"use client";

import { cn } from "@/lib/utils";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export function BorderBeam({
  className,
  duration = 8,
  borderWidth = 1.5,
  colorFrom = "#007acc",
  colorTo = "#38bdf8",
  delay = 0,
}: BorderBeamProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]",
        "animate-border-beam",
        className,
      )}
      style={
        {
          "--duration": `${duration}s`,
          "--delay": `-${delay}s`,
          borderRadius: "inherit",
          padding: borderWidth,
          background: `conic-gradient(from var(--beam-angle), transparent 68%, ${colorFrom} 80%, ${colorTo} 88%, transparent 100%)`,
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          maskComposite: "exclude",
        } as React.CSSProperties
      }
    />
  );
}

export default BorderBeam;
