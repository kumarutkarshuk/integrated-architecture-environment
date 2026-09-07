import { cn } from "@/lib/utils";

/**
 * Marks a control or surface as AI. Deliberately a solid chip rather than
 * tinted text on glass, so the colour stays legible over anything.
 */
export function AiBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-ai px-2 py-0.5 text-[0.625rem] font-semibold tracking-wide text-ai-foreground uppercase",
        className,
      )}
    >
      AI
    </span>
  );
}
