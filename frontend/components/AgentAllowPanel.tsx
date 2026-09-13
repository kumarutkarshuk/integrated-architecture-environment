"use client";

import { Bot } from "lucide-react";
import { FadeIn } from "./FadeIn";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import {
  claudeCodeRelayCommand,
  codexRelayConfig,
  cursorRelayConfig,
  getWidgetOrigin,
} from "../lib/canvas-agent/relay-copy";

interface AgentAllowPanelProps {
  allowed: boolean;
  onAllowedChange: (allowed: boolean) => void;
}

export function AgentAllowPanel({
  allowed,
  onAllowedChange,
}: AgentAllowPanelProps) {
  const origin = getWidgetOrigin();

  return (
    <FadeIn
      fromX={8}
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 font-mono text-xs"
    >
      <div className="flex items-start justify-between gap-3 rounded-lg border border-sidebar-border bg-panel p-2.5">
        <div className="min-w-0 space-y-1">
          <Label htmlFor="allow-agent" className="text-xs font-medium">
            Allow agent to edit this canvas
          </Label>
          <p className="text-[10px] leading-relaxed text-muted">
            Off until you turn it on in this tab. Reload starts off again.
          </p>
          {allowed ? (
            <p className="text-[10px] text-accent">
              The agent can read this canvas.
            </p>
          ) : null}
        </div>
        <Switch
          id="allow-agent"
          checked={allowed}
          onCheckedChange={onAllowedChange}
          aria-label="Allow agent to edit this canvas"
        />
      </div>

      <div className="space-y-2">
        <p className="text-[10px] leading-relaxed text-muted">
          Add the local WebMCP relay, then keep this tab open. Restrict the
          widget origin to this app.
        </p>
        <RelayBlock title="Cursor" code={cursorRelayConfig(origin)} />
        <RelayBlock title="Claude Code" code={claudeCodeRelayCommand(origin)} />
        <RelayBlock title="Codex" code={codexRelayConfig(origin)} />
      </div>
    </FadeIn>
  );
}

function RelayBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        {title}
      </p>
      <pre className="overflow-x-auto rounded-md border border-sidebar-border bg-background p-2 text-[10px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}

export function AgentAllowEmpty() {
  return (
    <FadeIn
      fromX={8}
      className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center text-xs font-mono text-muted"
    >
      <Bot className="h-8 w-8 text-muted/50" aria-hidden />
      <p>Open a ready Project to allow an agent.</p>
    </FadeIn>
  );
}
