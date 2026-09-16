import { cn } from "../lib/utils";

export const MOBILE_DESKTOP_HINT =
  "For a better experience, use a desktop browser.";

export function MobileDesktopHint({ className }: { className?: string }) {
  return (
    <p className={cn("text-[11px] text-muted md:hidden", className)}>
      {MOBILE_DESKTOP_HINT}
    </p>
  );
}
