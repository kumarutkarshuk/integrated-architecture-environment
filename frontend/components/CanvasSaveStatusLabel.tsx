import type { CanvasSaveStatus } from "../hooks/useYjsTldrawStore";

interface CanvasSaveStatusLabelProps {
  status: CanvasSaveStatus;
}

export function CanvasSaveStatusLabel({ status }: CanvasSaveStatusLabelProps) {
  const dotColor =
    status === "saved"
      ? "bg-emerald-400"
      : status === "saving"
      ? "bg-amber-400 animate-pulse"
      : status === "offline"
      ? "bg-amber-400"
      : status === "error"
      ? "bg-red-400"
      : "bg-muted";

  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-md border border-sidebar-border bg-sidebar px-2 font-mono text-[11px]">
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {status === "loading" && <span className="text-muted">Loading canvas...</span>}
      {status === "saving" && <span className="text-amber-400">Saving...</span>}
      {status === "saved" && <span className="text-emerald-400">Saved</span>}
      {status === "offline" && <span className="text-amber-400">Offline</span>}
      {status === "error" && <span className="text-red-400">Save unavailable</span>}
    </span>
  );
}
