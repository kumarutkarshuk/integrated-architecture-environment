"use client";

import { Bot, Copy } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { FadeIn } from "./FadeIn";
import { AiCue } from "./AiCue";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { captureProductEvent } from "../lib/analytics";
import {
  claudeCodeRelayCommand,
  codexRelayConfig,
  cursorRelayConfig,
  getWidgetOrigin,
} from "../lib/canvas-agent/relay-copy";
import { isWebMcpCompatibleBrowser } from "../lib/canvas-agent/webmcp-support";

const MCP_CLIENT_BY_TITLE = {
  Cursor: "cursor",
  "Claude Code": "claude_code",
  Codex: "codex",
} as const;

interface AgentAllowPanelProps {
  allowed: boolean;
  isLoading?: boolean;
  onAllowedChange: (allowed: boolean) => void;
}

let webMcpSupportToasted = false;

export function AgentAllowPanel({
  allowed,
  isLoading = false,
  onAllowedChange,
}: AgentAllowPanelProps) {
  const origin = getWidgetOrigin();
  const webMcpCompatible = isWebMcpCompatibleBrowser();

  useEffect(() => {
    if (!webMcpCompatible || webMcpSupportToasted) {
      return;
    }

    webMcpSupportToasted = true;
    toast("This browser can let an AI agent draw on the canvas.");
  }, [webMcpCompatible]);

  return (
    <FadeIn
      fromX={8}
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 font-mono text-xs"
    >
      <div className="relative shrink-0 overflow-hidden rounded-lg border border-sidebar-border bg-panel px-3 pt-3 pb-4">
        <AiCue duration={7} />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <Label
              htmlFor="allow-agent"
              className="block text-xs leading-snug font-medium"
            >
              Allow an agent to edit this canvas
            </Label>
            <p className="text-[10px] leading-relaxed text-muted">
              Note: Reload turns it off.
              {webMcpCompatible
                ? null
                : " Only WebMCP browsers can let an AI agent draw on this canvas."}
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
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sky-400">
            <span className="h-2 w-2 animate-ping rounded-full bg-sky-400" />
            <p className="text-muted">Loading WebMCP...</p>
          </div>
        ) : null}
        <p className="text-[10px] leading-relaxed text-muted">
          Add this MCP config to Cursor, Claude Code, or Codex and ask the agent to use WebMCP to modify the canvas.
        </p>
        <SetupBlock title="Cursor" code={cursorRelayConfig(origin)} />
        <SetupBlock title="Claude Code" code={claudeCodeRelayCommand(origin)} />
        <SetupBlock title="Codex" code={codexRelayConfig(origin)} />
      </div>
    </FadeIn>
  );
}

function SetupBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
          {title}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-1.5 text-[10px] text-muted hover:text-foreground"
          aria-label={`Copy ${title} setup`}
          onClick={() => {
            void copySetup(title, code);
          }}
        >
          <Copy className="size-3" />
          Copy
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-md border border-sidebar-border bg-background p-2 text-[10px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}

async function copySetup(title: string, code: string) {
  try {
    await navigator.clipboard.writeText(code);
    toast.success(`Copied ${title} config`);
    const client =
      MCP_CLIENT_BY_TITLE[title as keyof typeof MCP_CLIENT_BY_TITLE];
    if (client) {
      captureProductEvent("mcp_config_copied", { client });
    }
  } catch {
    toast.error("Could not copy");
  }
}

export function AgentAllowEmpty() {
  return (
    <FadeIn
      fromX={8}
      className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center text-xs font-mono text-muted"
    >
      <Bot className="h-8 w-8 text-muted/50" aria-hidden />
      <p>Open a ready project to allow an agent.</p>
    </FadeIn>
  );
}
