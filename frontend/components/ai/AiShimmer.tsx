import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface AiShimmerProps {
  children: ReactNode;
  isRunning: boolean;
  className?: string;
}

/**
 * Sweeps AI colour across a surface while an AI Generation is in flight. The
 * sweep is decorative and loops in CSS, so it never competes with a gesture.
 */
export function AiShimmer({ children, isRunning, className }: AiShimmerProps) {
  return (
    <span className={cn("relative inline-flex overflow-hidden", className)}>
      {children}
      {isRunning && (
        <span aria-hidden className="ai-shimmer absolute inset-0" />
      )}
    </span>
  );
}
