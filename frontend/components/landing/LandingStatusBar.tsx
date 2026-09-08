import { presentShellStatus } from "../../lib/shellStatus";

interface LandingStatusBarProps {
  canvasLabel: string;
}

export function LandingStatusBar({ canvasLabel }: LandingStatusBarProps) {
  const { dotColor, label } = presentShellStatus("idle");

  return (
    <footer
      className="workspace-statusbar z-20 flex h-5.5 w-full shrink-0 items-center justify-between border-t border-sidebar-border bg-[#181818] px-3 font-mono text-[11px] text-muted select-none"
      aria-label="Status Bar"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
        <span className="text-foreground/90">{label}</span>
        <span className="text-muted/40">•</span>
        <span className="max-w-xs truncate" title={canvasLabel}>
          {canvasLabel}
        </span>
      </div>

      <span className="shrink-0">Landing</span>
    </footer>
  );
}
