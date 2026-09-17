"use client";

import { Bot, Copy } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { FadeIn } from "./FadeIn";
import { useStaggerReveal } from "../hooks/useStaggerReveal";
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
import { useIsMobile } from "../hooks/useIsMobile";
import { isWebMcpCompatibleBrowser } from "../lib/canvas-agent/webmcp-support";

const MCP_CLIENT_BY_TITLE = {
  Cursor: "cursor",
  "Claude Code": "claude_code",
  Codex: "codex",
} as const;

interface AgentAllowPanelProps {
  allowed: boolean;
  onAllowedChange: (allowed: boolean) => void;
  revealKey: string;
  header?: ReactNode;
}

export function AgentAllowPanel({
  allowed,
  onAllowedChange,
  revealKey,
  header,
}: AgentAllowPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const origin = getWidgetOrigin();
  const webMcpCompatible = isWebMcpCompatibleBrowser();
  const isMobile = useIsMobile();
  const canAllowAgent = webMcpCompatible && !isMobile;

  useStaggerReveal(listRef, {
    itemsKey: revealKey,
    enabled: true,
    fromX: 8,
    fromY: 8,
  });

  return (
    <div ref={listRef} className="flex min-h-0 min-w-0 flex-1 flex-col">
      {header ? (
        <div
          data-stagger-item={`${revealKey}:rating`}
          className="border-b border-sidebar-border px-3 py-2"
        >
          {header}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 font-mono text-xs">
        <div
          data-stagger-item={`${revealKey}:allow`}
          className="relative shrink-0 overflow-hidden rounded-lg border border-sidebar-border bg-panel px-3 pt-3 pb-4"
        >
          <AiCue duration={7} />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <Label
                htmlFor="allow-agent"
                className="block text-xs leading-snug font-medium"
              >
                Allow an agent to edit this canvas
              </Label>
              <p
                id="allow-agent-reason"
                className="text-[10px] leading-relaxed text-muted"
              >
                {isMobile
                  ? "Agents cannot edit the canvas on phones. Use desktop Chrome or Edge."
                  : webMcpCompatible
                    ? "Note: Reload turns it off."
                    : "This browser cannot let an agent draw on the canvas. Use desktop Chrome or Edge."}
              </p>
              {allowed && canAllowAgent ? (
                <p className="text-[10px] text-accent">
                  The agent can read this canvas.
                </p>
              ) : null}
            </div>
            <Switch
              id="allow-agent"
              checked={allowed && canAllowAgent}
              disabled={!canAllowAgent}
              onCheckedChange={onAllowedChange}
              aria-label="Allow agent to edit this canvas"
              aria-describedby="allow-agent-reason"
            />
          </div>
        </div>

        <div className="space-y-2">
          <p
            data-stagger-item={`${revealKey}:intro`}
            className="text-[10px] leading-relaxed text-muted"
          >
            Add this MCP config to Cursor, Claude Code, or Codex and ask the agent to use WebMCP to modify the canvas. Also, make sure to allow &quot;Apps on device&quot; in the browser.
          </p>
          <SetupBlock
            itemId={`${revealKey}:cursor`}
            title="Cursor"
            code={cursorRelayConfig(origin)}
            copyDisabled={isMobile}
          />
          <SetupBlock
            itemId={`${revealKey}:claude`}
            title="Claude Code"
            code={claudeCodeRelayCommand(origin)}
            copyDisabled={isMobile}
          />
          <SetupBlock
            itemId={`${revealKey}:codex`}
            title="Codex"
            code={codexRelayConfig(origin)}
            copyDisabled={isMobile}
          />
        </div>
      </div>
    </div>
  );
}

function SetupBlock({
  itemId,
  title,
  code,
  copyDisabled = false,
}: {
  itemId: string;
  title: string;
  code: string;
  copyDisabled?: boolean;
}) {
  return (
    <div className="space-y-1" data-stagger-item={itemId}>
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
          disabled={copyDisabled}
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
