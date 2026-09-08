"use client";

import {
  AlertCircle,
  Check,
  CloudOff,
  Loader2,
  Radio,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import type {
  CanvasSaveStatus,
  ConnectionHealth,
} from "../hooks/useYjsTldrawStore";

interface StatusBarProps {
  saveStatus: CanvasSaveStatus;
  connectionHealth: ConnectionHealth;
  collaboratorCount: number;
  projectName?: string | null;
  mode?: "canvas" | "preview" | "none";
}

export function StatusBar({
  saveStatus,
  connectionHealth,
  collaboratorCount,
  projectName,
  mode = "canvas",
}: StatusBarProps) {
  function renderSaveState() {
    if (mode === "preview") {
      return (
        <span
          data-testid="status-bar-save"
          className="flex items-center gap-1.5 text-purple-300"
        >
          <Sparkles className="size-3 text-purple-400" />
          <span>Proposal Preview</span>
        </span>
      );
    }

    if (mode === "none") {
      return (
        <span
          data-testid="status-bar-save"
          className="flex items-center gap-1.5 text-muted"
        >
          <span>Ready</span>
        </span>
      );
    }

    switch (saveStatus) {
      case "saving":
        return (
          <span
            data-testid="status-bar-save"
            className="flex items-center gap-1.5 text-amber-400"
          >
            <RefreshCw className="size-3 animate-spin text-amber-400" />
            <span>Saving...</span>
          </span>
        );
      case "saved":
        return (
          <span
            data-testid="status-bar-save"
            className="flex items-center gap-1.5 text-emerald-400"
          >
            <Check className="size-3 text-emerald-400" />
            <span>Saved</span>
          </span>
        );
      case "loading":
        return (
          <span
            data-testid="status-bar-save"
            className="flex items-center gap-1.5 text-muted"
          >
            <Loader2 className="size-3 animate-spin text-muted" />
            <span>Loading canvas...</span>
          </span>
        );
      case "offline":
        return (
          <span
            data-testid="status-bar-save"
            className="flex items-center gap-1.5 text-amber-400"
          >
            <CloudOff className="size-3 text-amber-400" />
            <span>Offline</span>
          </span>
        );
      case "error":
        return (
          <span
            data-testid="status-bar-save"
            className="flex items-center gap-1.5 text-red-400"
          >
            <AlertCircle className="size-3 text-red-400" />
            <span>Save unavailable</span>
          </span>
        );
    }
  }

  function renderConnectionHealth() {
    if (connectionHealth === "online") {
      return (
        <span
          data-testid="status-bar-connection"
          className="flex items-center gap-1.5 text-muted"
        >
          <span className="size-2 rounded-full bg-emerald-500 inline-block" />
          <span>Connected</span>
        </span>
      );
    }

    if (connectionHealth === "connecting") {
      return (
        <span
          data-testid="status-bar-connection"
          className="flex items-center gap-1.5 text-amber-400"
        >
          <span className="size-2 rounded-full bg-amber-400 animate-pulse inline-block" />
          <span>Connecting...</span>
        </span>
      );
    }

    return (
      <span
        data-testid="status-bar-connection"
        className="flex items-center gap-1.5 text-red-400"
      >
        <span className="size-2 rounded-full bg-red-400 inline-block" />
        <span>Offline</span>
      </span>
    );
  }

  const effectiveCollaboratorCount =
    mode === "none" ? 0 : Math.max(1, collaboratorCount);

  return (
    <footer
      role="status"
      aria-label="Status Bar"
      className="flex h-5.5 w-full shrink-0 items-center justify-between border-t border-sidebar-border bg-[#181818] px-2 text-[11px] leading-none text-muted select-none"
    >
      {/* Left side items */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-foreground">
          <Radio className="size-3 text-accent" />
          <span className="font-medium">
            {projectName
              ? `Project: ${projectName}`
              : "Integrated Architecture Environment"}
          </span>
        </div>

        <div className="h-3 w-px bg-sidebar-border" />

        {renderConnectionHealth()}

        <div className="h-3 w-px bg-sidebar-border" />

        {renderSaveState()}
      </div>

      {/* Right side items */}
      <div className="flex items-center gap-3">
        <span
          data-testid="status-bar-collaborators"
          className="flex items-center gap-1.5"
        >
          <Users className="size-3 text-muted" />
          <span>
            {effectiveCollaboratorCount}{" "}
            {effectiveCollaboratorCount === 1 ? "collaborator" : "collaborators"}{" "}
            online
          </span>
        </span>

        <div className="h-3 w-px bg-sidebar-border" />

        <span className="text-muted">
          {mode === "preview"
            ? "Preview Mode"
            : mode === "canvas"
            ? "Live Canvas"
            : "No Project"}
        </span>

        <span className="hidden sm:inline text-muted/60">UTF-8</span>
      </div>
    </footer>
  );
}
