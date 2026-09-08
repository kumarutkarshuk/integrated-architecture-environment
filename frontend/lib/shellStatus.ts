import type { CanvasSaveStatus } from "../hooks/useYjsTldrawStore";

export type ShellStatus =
  | CanvasSaveStatus
  | "idle"
  | "preview"
  | "generating"
  | "live"
  | "connecting";

export function deriveWorkspaceShellStatus(args: {
  hasProject: boolean;
  projectReady: boolean;
  isGenerating: boolean;
  canvasActionsEnabled: boolean;
  saveStatus: CanvasSaveStatus;
}): ShellStatus {
  if (!args.hasProject) {
    return "idle";
  }

  if (!args.projectReady) {
    return args.isGenerating ? "generating" : "preview";
  }

  if (args.canvasActionsEnabled) {
    if (args.saveStatus === "saving") {
      return "saving";
    }

    if (args.saveStatus === "offline") {
      return "offline";
    }

    if (args.saveStatus === "error") {
      return "error";
    }

    return "live";
  }

  if (args.saveStatus === "offline") {
    return "offline";
  }

  if (args.saveStatus === "error") {
    return "error";
  }

  return "connecting";
}

export function presentShellStatus(status: ShellStatus): {
  label: string;
  dotColor: string;
  pulse: boolean;
} {
  switch (status) {
    case "live":
    case "saved":
      return { label: "CRDT Live", dotColor: "bg-emerald-400", pulse: true };
    case "connecting":
      return { label: "Connecting", dotColor: "bg-amber-400", pulse: true };
    case "offline":
      return { label: "Offline", dotColor: "bg-amber-400", pulse: false };
    case "saving":
      return {
        label: "Saving",
        dotColor: "bg-amber-400 animate-pulse",
        pulse: false,
      };
    case "error":
      return { label: "Error", dotColor: "bg-red-400", pulse: false };
    case "preview":
      return { label: "Preview", dotColor: "bg-sky-400", pulse: false };
    case "generating":
      return {
        label: "Generating",
        dotColor: "bg-sky-400 animate-pulse",
        pulse: true,
      };
    case "loading":
      return {
        label: "Loading",
        dotColor: "bg-muted animate-pulse",
        pulse: true,
      };
    default:
      return { label: "Idle", dotColor: "bg-muted", pulse: false };
  }
}
