import { LandingSourceLinks } from "./LandingSourceLinks";

interface LandingStatusBarProps {
  canvasLabel: string;
}

export function LandingStatusBar({ canvasLabel }: LandingStatusBarProps) {
  return (
    <footer
      className="workspace-statusbar z-20 flex h-5.5 w-full shrink-0 items-center justify-between border-t border-sidebar-border bg-[#181818] px-3 font-mono text-[11px] text-muted select-none"
      aria-label="Status Bar"
    >
      <span className="max-w-xs truncate" title={canvasLabel}>
        {canvasLabel}
      </span>

      <LandingSourceLinks className="gap-3" />
    </footer>
  );
}
