"use client";

import { useState } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

interface LandingHeroDiagramProps {
  reducedMotion?: boolean;
}

export function LandingHeroDiagram({
  reducedMotion: explicitReducedMotion,
}: LandingHeroDiagramProps) {
  const systemPrefersReduced = usePrefersReducedMotion();
  const [manualOverride, setManualOverride] = useState<boolean | null>(null);

  const isReducedMotion =
    explicitReducedMotion ??
    (manualOverride !== null ? manualOverride : systemPrefersReduced);

  return (
    <div
      data-testid="architecture-diagram-container"
      data-reduced-motion={isReducedMotion ? "true" : "false"}
      className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-sidebar-border bg-sidebar/80 p-5 shadow-2xl backdrop-blur-sm"
    >
      {/* Top canvas bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border pb-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
          </div>
          <span className="ml-2 font-mono text-muted">
            architecture-workspace.iae
          </span>
          <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-medium text-accent">
            Yjs Active
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-muted">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            <span>3 active editors</span>
          </div>

          <button
            type="button"
            onClick={() => setManualOverride(!isReducedMotion)}
            className="flex items-center gap-1.5 rounded border border-sidebar-border bg-panel px-2.5 py-1 text-xs text-foreground hover:bg-hover transition-colors"
            title="Toggle between animated flow and smooth static reduced motion"
          >
            <span>Motion:</span>
            <span className="font-medium text-accent">
              {isReducedMotion ? "Reduced" : "Normal"}
            </span>
          </button>
        </div>
      </div>

      {/* Nodes grid layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Node 1: Collaborative Clients */}
        <div className="relative rounded-lg border border-sidebar-border bg-panel p-4 shadow-sm transition-all hover:border-accent/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-accent">
              Frontend Client
            </span>
            <span className="rounded bg-muted/20 px-1.5 py-0.5 text-[10px] text-foreground">
              tldraw canvas
            </span>
          </div>
          <h4 className="mt-2 text-sm font-semibold text-foreground">
            Collaborative Clients
          </h4>
          <p className="mt-1 text-xs text-muted">
            Multi-cursor collaborative canvas with real-time peer presence and
            instant visual edits.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
            {isReducedMotion ? (
              <span
                data-testid="static-flow-indicator"
                className="h-2 w-2 rounded-full bg-accent"
              />
            ) : (
              <span
                data-testid="motion-flow-indicator"
                className="relative flex h-2 w-2"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
            )}
            <span>Live WebSockets</span>
          </div>
        </div>

        {/* Node 2: API Gateway */}
        <div className="relative rounded-lg border border-sidebar-border bg-panel p-4 shadow-sm transition-all hover:border-accent/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-accent">
              Gateway
            </span>
            <span className="rounded bg-muted/20 px-1.5 py-0.5 text-[10px] text-foreground">
              Clerk Auth
            </span>
          </div>
          <h4 className="mt-2 text-sm font-semibold text-foreground">
            API Gateway
          </h4>
          <p className="mt-1 text-xs text-muted">
            JWT verification, project access authorization, and Upstash rate
            limiting per user.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
            {isReducedMotion ? (
              <span
                data-testid="static-flow-indicator"
                className="h-2 w-2 rounded-full bg-green-500"
              />
            ) : (
              <span
                data-testid="motion-flow-indicator"
                className="relative flex h-2 w-2"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
            )}
            <span>Auth Verified</span>
          </div>
        </div>

        {/* Node 3: Real-Time Sync Engine */}
        <div className="relative rounded-lg border border-sidebar-border bg-panel p-4 shadow-sm transition-all hover:border-accent/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-accent">
              Sync Engine
            </span>
            <span className="rounded bg-muted/20 px-1.5 py-0.5 text-[10px] text-foreground">
              WebSocket Room
            </span>
          </div>
          <h4 className="mt-2 text-sm font-semibold text-foreground">
            Real-Time Sync (Yjs CRDT)
          </h4>
          <p className="mt-1 text-xs text-muted">
            In-memory CRDT authoritative state with zero-conflict document merges
            across all peers.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
            {isReducedMotion ? (
              <span
                data-testid="static-flow-indicator"
                className="h-2 w-2 rounded-full bg-cyan-400"
              />
            ) : (
              <span
                data-testid="motion-flow-indicator"
                className="relative flex h-2 w-2"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              </span>
            )}
            <span>Instant Peer Sync</span>
          </div>
        </div>

        {/* Node 4: AI Generation Engine */}
        <div className="relative rounded-lg border border-sidebar-border bg-panel p-4 shadow-sm transition-all hover:border-accent/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-accent">
              AI Worker
            </span>
            <span className="rounded bg-muted/20 px-1.5 py-0.5 text-[10px] text-foreground">
              Trigger.dev + Groq
            </span>
          </div>
          <h4 className="mt-2 text-sm font-semibold text-foreground">
            AI Generation Engine
          </h4>
          <p className="mt-1 text-xs text-muted">
            Prompt-to-architecture engine with non-blocking previews, prompt
            iteration, and single-click apply.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
            {isReducedMotion ? (
              <span
                data-testid="static-flow-indicator"
                className="h-2 w-2 rounded-full bg-purple-400"
              />
            ) : (
              <span
                data-testid="motion-flow-indicator"
                className="relative flex h-2 w-2"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-400" />
              </span>
            )}
            <span>Preview Pipeline</span>
          </div>
        </div>

        {/* Node 5: Canvas Snapshots */}
        <div className="relative rounded-lg border border-sidebar-border bg-panel p-4 shadow-sm transition-all hover:border-accent/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-accent">
              Persistence
            </span>
            <span className="rounded bg-muted/20 px-1.5 py-0.5 text-[10px] text-foreground">
              Prisma + Postgres
            </span>
          </div>
          <h4 className="mt-2 text-sm font-semibold text-foreground">
            Canvas Snapshots (PostgreSQL)
          </h4>
          <p className="mt-1 text-xs text-muted">
            Debounced canvas snapshot persistence for instant cold-start restores
            and crash resilience.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
            {isReducedMotion ? (
              <span
                data-testid="static-flow-indicator"
                className="h-2 w-2 rounded-full bg-emerald-400"
              />
            ) : (
              <span
                data-testid="motion-flow-indicator"
                className="relative flex h-2 w-2"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
            )}
            <span>Auto-Saved</span>
          </div>
        </div>

        {/* Node 6: Spec Generator */}
        <div className="relative rounded-lg border border-sidebar-border bg-panel p-4 shadow-sm transition-all hover:border-accent/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-accent">
              Documentation
            </span>
            <span className="rounded bg-muted/20 px-1.5 py-0.5 text-[10px] text-foreground">
              Markdown
            </span>
          </div>
          <h4 className="mt-2 text-sm font-semibold text-foreground">
            Spec Generator & Gaps
          </h4>
          <p className="mt-1 text-xs text-muted">
            One-click export producing architectural markdown specs with inferred
            decisions and missing gap analysis.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
            {isReducedMotion ? (
              <span
                data-testid="static-flow-indicator"
                className="h-2 w-2 rounded-full bg-amber-400"
              />
            ) : (
              <span
                data-testid="motion-flow-indicator"
                className="relative flex h-2 w-2"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
            )}
            <span>Export Ready</span>
          </div>
        </div>
      </div>

      {/* SVG Connecting Flow Lines Overlay */}
      <div className="mt-6 border-t border-sidebar-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <div className="flex items-center gap-2">
            <span className="font-mono text-foreground">Data Path:</span>
            <span>Client</span>
            <span>→</span>
            <span>Gateway</span>
            <span>→</span>
            <span>Yjs CRDT</span>
            <span>→</span>
            <span>Postgres Snapshot</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-accent">Latency: ~12ms</span>
            <span>•</span>
            <span className="text-emerald-400">Status: Healthy</span>
          </div>
        </div>
      </div>
    </div>
  );
}
