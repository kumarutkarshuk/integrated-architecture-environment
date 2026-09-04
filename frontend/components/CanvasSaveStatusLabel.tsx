import type { CanvasSaveStatus } from "../hooks/useYjsTldrawStore";

interface CanvasSaveStatusLabelProps {
  status: CanvasSaveStatus;
}

export function CanvasSaveStatusLabel({ status }: CanvasSaveStatusLabelProps) {
  switch (status) {
    case "loading":
      return <span className="text-muted">Loading canvas...</span>;
    case "saving":
      return <span className="text-amber-400">Saving...</span>;
    case "saved":
      return <span className="text-emerald-400">Saved</span>;
    case "offline":
      return <span className="text-amber-400">Offline</span>;
    case "error":
      return <span className="text-red-400">Save unavailable</span>;
  }
}
