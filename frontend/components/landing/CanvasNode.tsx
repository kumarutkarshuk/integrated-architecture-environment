import { cn } from "../../lib/utils";

/** The system the demos all show, in the order it depends on itself. */
export const DEMO_NODES = ["API Gateway", "Orders Service", "Postgres"];

interface CanvasNodeProps {
  label: string;
  /** Draws the arrow reaching this node from the one before it. */
  hasIncomingArrow?: boolean;
  className?: string;
}

/** One box on a mock canvas, so every demo draws the same box. */
export function CanvasNode({
  label,
  hasIncomingArrow = false,
  className,
}: CanvasNodeProps) {
  return (
    <span className={cn("flex items-center gap-2 sm:gap-3", className)}>
      {hasIncomingArrow && (
        <span aria-hidden className="text-muted">
          →
        </span>
      )}
      <span className="rounded-lg border border-glass-highlight bg-panel/70 px-3 py-2 text-xs whitespace-nowrap sm:text-sm">
        {label}
      </span>
    </span>
  );
}
