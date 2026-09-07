import { Badge } from "../ui/badge";

/**
 * Marks a control or surface as AI. Deliberately a solid chip rather than
 * tinted text on glass, so the colour stays legible over anything.
 */
export function AiBadge({ className }: { className?: string }) {
  return (
    <Badge variant="ai" className={className}>
      AI
    </Badge>
  );
}
