import { cn } from "@/lib/utils";

/**
 * A soft pool of AI colour behind a surface that is thinking. Purely
 * decorative, so it stays out of the accessibility tree.
 */
export function AiGlow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute -inset-8 -z-10 rounded-[50%] bg-ai-glow blur-3xl",
        className,
      )}
    />
  );
}
