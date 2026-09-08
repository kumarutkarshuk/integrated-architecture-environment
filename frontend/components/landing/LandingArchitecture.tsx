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

interface StackItem {
  id: string;
  layer: string;
  name: string;
  stack: string;
  metric: string;
  metricLabel: string;
  summary: string;
}

const STACK_DATA: StackItem[] = [
  {
    id: "surface",
    layer: "01 Surface",
    name: "Interactive Canvas UI",
    stack: "Next.js 16 &bull; React 19 &bull; tldraw",
    metric: "60 FPS",
    metricLabel: "Canvas rendering",
    summary: "Infinite zoom and pan canvas with VS Code style panels and toolbars.",
  },
  {
    id: "sync",
    layer: "02 Sync Bus",
    name: "Multiplayer CRDT",
    stack: "Yjs &bull; WebSocket Provider",
    metric: "< 5ms",
    metricLabel: "Sync latency",
    summary: "Collision-free document merge with live multiplayer presence cursors.",
  },
  {
    id: "api",
    layer: "03 Core Backend",
    name: "Application API & DB",
    stack: "Express &bull; PostgreSQL &bull; Prisma &bull; Clerk",
    metric: "ACID",
    metricLabel: "Data durability",
    summary: "Secure project storage, invite tokens, and snapshot management.",
  },
  {
    id: "ai",
    layer: "04 AI Engine",
    name: "Background AI Pipeline",
    stack: "Trigger.dev &bull; Groq &bull; Llama 3.3",
    metric: "Async",
    metricLabel: "Job queue",
    summary: "Fast topology generation and automatic markdown RFC production.",
  },
];

export function LandingArchitecture() {
  const containerRef = useRef<HTMLElement>(null);
  const [activeLayer, setActiveLayer] = useState<string>("surface");

  useGSAP(
    () => {
      ensureScrollTrigger();
      const prefersReduced =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) return;

      const cards = gsap.utils.toArray<HTMLElement>(".arch-card");
      gsap.from(cards, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 75%",
        },
        y: 16,
        opacity: 0,
        stagger: 0.1,
        duration: 0.6,
        ease: "power2.out",
      });
    },
    { scope: containerRef },
  );

  const selectedItem =
    STACK_DATA.find((item) => item.id === activeLayer) ?? STACK_DATA[0];

  return (
    <section
      id="architecture"
      ref={containerRef}
      className="relative border-b border-sidebar-border px-4 py-16 md:px-8 md:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-12">
          <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
            System Stack
          </span>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Built for speed and resilience
          </h2>
          <p className="mt-2 text-sm text-muted max-w-xl md:text-base">
            Four purpose-built layers working together in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Stack Layer Cards (left 7 cols) */}
          <div className="space-y-3 md:col-span-7">
            {STACK_DATA.map((item) => {
              const isSelected = item.id === activeLayer;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveLayer(item.id)}
                  className={`arch-card w-full text-left rounded-lg border p-4 transition-all duration-200 ${
                    isSelected
                      ? "border-accent bg-sidebar shadow-md shadow-accent/15"
                      : "border-sidebar-border bg-sidebar/70 hover:border-sidebar-border/80 hover:bg-sidebar"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-semibold text-accent">
                      {item.layer}
                    </span>
                    <span className="font-mono text-xs text-emerald-400">
                      {item.metric}
                    </span>
                  </div>

                  <h3 className="mt-1 text-sm font-semibold text-foreground">
                    {item.name}
                  </h3>

                  <div
                    className="mt-1 font-mono text-xs text-muted"
                    dangerouslySetInnerHTML={{ __html: item.stack }}
                  />
                </button>
              );
            })}
          </div>

          {/* Layer Deep Dive Inspector (right 5 cols) */}
          <div className="relative rounded-xl border border-sidebar-border bg-sidebar p-6 md:col-span-5 flex flex-col justify-between min-h-80 overflow-hidden">
            <BorderBeam
              size={200}
              duration={10}
              colorFrom="#007acc"
              colorTo="#38bdf8"
              borderWidth={1}
            />

            <div>
              <div className="flex items-center justify-between text-xs font-mono text-muted">
                <span>Selected Tier</span>
                <span className="text-accent">{selectedItem.layer}</span>
              </div>

              <h3 className="mt-3 text-lg font-semibold text-foreground">
                {selectedItem.name}
              </h3>

              <p className="mt-3 text-sm text-muted leading-relaxed">
                {selectedItem.summary}
              </p>

              <div className="mt-6 rounded-lg border border-sidebar-border bg-panel p-4">
                <div className="text-2xl font-bold font-mono text-foreground">
                  {selectedItem.metric}
                </div>
                <div className="text-xs text-muted font-mono mt-0.5">
                  {selectedItem.metricLabel}
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-sidebar-border pt-4 flex items-center justify-between font-mono text-xs text-muted">
              <span>Status: Operational</span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Live
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
