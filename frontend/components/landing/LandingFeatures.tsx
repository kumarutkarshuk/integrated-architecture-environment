"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useState } from "react";
import { BorderBeam } from "../ui/border-beam";

function ensureScrollTrigger() {
  if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
  }
}

interface PromptPreset {
  label: string;
  query: string;
  nodes: string[];
}

const PRESETS: PromptPreset[] = [
  {
    label: "Event Bus",
    query: "iae generate 'High-throughput Kafka stream with 3 workers'",
    nodes: ["API Gateway", "Kafka Cluster", "Worker Pool", "Postgres DB"],
  },
  {
    label: "Auth Edge",
    query: "iae generate 'Clerk JWT edge validation and session cache'",
    nodes: ["Edge Proxy", "Clerk Provider", "Redis Cache", "User Service"],
  },
  {
    label: "AI Pipeline",
    query: "iae generate 'Async RAG embedding pipeline with vector store'",
    nodes: ["Ingest API", "Trigger.dev", "Qdrant Vector", "Llama 3.3"],
  },
];

export function LandingFeatures() {
  const containerRef = useRef<HTMLElement>(null);
  const [activePresetIdx, setActivePresetIdx] = useState(0);
  const [copiedSpec, setCopiedSpec] = useState(false);

  useGSAP(
    () => {
      ensureScrollTrigger();
      const prefersReduced =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) return;

      const items = gsap.utils.toArray<HTMLElement>(".bento-item");
      gsap.from(items, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
        },
        y: 20,
        opacity: 0,
        stagger: 0.1,
        duration: 0.7,
        ease: "power2.out",
      });
    },
    { scope: containerRef },
  );

  const activePreset = PRESETS[activePresetIdx];

  const handleCopySpec = () => {
    setCopiedSpec(true);
    setTimeout(() => setCopiedSpec(false), 2000);
  };

  return (
    <section
      id="features"
      ref={containerRef}
      className="relative border-b border-sidebar-border px-4 py-16 md:px-8 md:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-12">
          <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
            Capabilities
          </span>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Everything you need to design fast
          </h2>
          <p className="mt-2 text-sm text-muted max-w-xl md:text-base">
            No bloated menus. Just prompt synthesis, multiplayer canvas, and
            clean spec export.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bento Card 1: Interactive Prompt to Architecture */}
          <div className="bento-item group relative rounded-xl border border-sidebar-border bg-sidebar p-5 flex flex-col justify-between overflow-hidden md:col-span-1">
            <div>
              <div className="flex h-7 w-7 items-center justify-center rounded bg-accent/20 text-accent font-mono text-xs font-bold">
                01
              </div>
              <h3 className="mt-3 text-base font-semibold text-foreground">
                Prompt to Architecture
              </h3>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                Type simple words. Get complete component topologies.
              </p>

              {/* Interactive prompt chips */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {PRESETS.map((preset, idx) => (
                  <button
                    key={preset.label}
                    onClick={() => setActivePresetIdx(idx)}
                    className={`rounded px-2 py-0.5 font-mono text-[11px] transition-colors ${
                      activePresetIdx === idx
                        ? "bg-accent text-white font-medium"
                        : "bg-hover text-muted hover:text-foreground"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic preview */}
            <div className="mt-5 space-y-2">
              <div className="rounded border border-sidebar-border bg-panel p-2 font-mono text-[10px] text-muted truncate">
                &gt; {activePreset.query}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {activePreset.nodes.map((node, i) => (
                  <div
                    key={node}
                    className="flex items-center gap-1.5 rounded border border-sidebar-border bg-hover/80 px-2 py-1 font-mono text-[10px] text-foreground transition-all duration-300"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <span className="truncate">{node}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bento Card 2: Real-time Multiplayer Canvas with Border Beam */}
          <div className="bento-item relative rounded-xl border border-sidebar-border bg-sidebar p-5 flex flex-col justify-between overflow-hidden md:col-span-2">
            <BorderBeam
              size={240}
              duration={14}
              colorFrom="#38bdf8"
              colorTo="#818cf8"
              borderWidth={1}
            />

            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-accent/20 text-accent font-mono text-xs font-bold">
                  02
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Sync
                  </span>
                  <span className="rounded bg-hover px-1.5 py-0.5 text-muted">
                    &lt; 5ms
                  </span>
                </div>
              </div>

              <h3 className="mt-3 text-base font-semibold text-foreground">
                Real-Time CRDT Canvas
              </h3>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                Multiplayer presence and collision-free document merge with Yjs
                and tldraw.
              </p>
            </div>

            {/* Visual canvas playground */}
            <div className="relative mt-6 min-h-36 rounded-lg border border-sidebar-border bg-panel/80 p-4 overflow-hidden">
              <div className="absolute top-4 left-6 flex items-center gap-1.5 rounded bg-sky-500/20 border border-sky-500/40 px-2 py-1 text-[11px] font-mono text-sky-300 shadow-sm animate-pulse">
                <span>cursor: Maya</span>
                <span className="text-[9px] text-muted">panning</span>
              </div>

              <div className="absolute bottom-4 right-8 flex items-center gap-1.5 rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-1 text-[11px] font-mono text-emerald-300 shadow-sm">
                <span>cursor: Daniel</span>
                <span className="text-[9px] text-muted">drawing queue</span>
              </div>

              <div className="flex h-full items-center justify-center gap-4 text-center">
                <div className="rounded border border-sidebar-border bg-sidebar px-3 py-1.5 text-xs font-mono text-foreground">
                  Ingress Proxy
                </div>
                <div className="text-muted font-mono text-xs">&rarr;</div>
                <div className="rounded border border-accent/40 bg-accent/15 px-3 py-1.5 text-xs font-mono text-accent">
                  Pub/Sub Buffer
                </div>
                <div className="text-muted font-mono text-xs">&rarr;</div>
                <div className="rounded border border-sidebar-border bg-sidebar px-3 py-1.5 text-xs font-mono text-foreground">
                  Storage
                </div>
              </div>
            </div>
          </div>

          {/* Bento Card 3: Instant Spec Export */}
          <div className="bento-item rounded-xl border border-sidebar-border bg-sidebar p-5 flex flex-col justify-between overflow-hidden md:col-span-2">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-accent/20 text-accent font-mono text-xs font-bold">
                  03
                </div>
                <button
                  onClick={handleCopySpec}
                  className="rounded border border-sidebar-border bg-hover px-2 py-0.5 font-mono text-[10px] text-muted hover:text-foreground transition-colors"
                >
                  {copiedSpec ? "Copied!" : "Copy Spec"}
                </button>
              </div>

              <h3 className="mt-3 text-base font-semibold text-foreground">
                1-Click Spec Export
              </h3>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                Turn visual nodes and arrows into complete RFC markdown documents.
              </p>
            </div>

            {/* Spec preview block */}
            <div className="mt-5 rounded-lg border border-sidebar-border bg-panel p-3 font-mono text-xs leading-relaxed text-muted">
              <span className="text-foreground font-semibold">
                # RFC 042: System Boundaries
              </span>
              <br />
              <span className="text-accent">- Services:</span> 4 active nodes (API,
              Stream, Worker, DB)
              <br />
              <span className="text-accent">- SLA:</span> 99.99% availability with
              re-routed fallback
              <br />
              <span className="text-accent">- Consensus:</span> Yjs binary CRDT document
              snapshots
            </div>
          </div>

          {/* Bento Card 4: Keyboard Ergonomics */}
          <div className="bento-item rounded-xl border border-sidebar-border bg-sidebar p-5 flex flex-col justify-between overflow-hidden md:col-span-1">
            <div>
              <div className="flex h-7 w-7 items-center justify-center rounded bg-accent/20 text-accent font-mono text-xs font-bold">
                04
              </div>
              <h3 className="mt-3 text-base font-semibold text-foreground">
                Editor Ergonomics
              </h3>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                Designed like your favorite code editor. Keyboard first.
              </p>
            </div>

            {/* Shortcut pills */}
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between rounded border border-sidebar-border bg-panel px-2.5 py-1.5 text-xs">
                <span className="text-muted">Prompt AI</span>
                <kbd className="rounded bg-hover px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                  ⌘K
                </kbd>
              </div>
              <div className="flex items-center justify-between rounded border border-sidebar-border bg-panel px-2.5 py-1.5 text-xs">
                <span className="text-muted">Pan Canvas</span>
                <kbd className="rounded bg-hover px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                  Space
                </kbd>
              </div>
              <div className="flex items-center justify-between rounded border border-sidebar-border bg-panel px-2.5 py-1.5 text-xs">
                <span className="text-muted">Export Spec</span>
                <kbd className="rounded bg-hover px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                  ⌘E
                </kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
