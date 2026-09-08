"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { useRef } from "react";
import { Button } from "../ui/button";

export function LandingHero() {
  const containerRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtextRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const prefersReduced =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(headlineRef.current, {
        y: 24,
        opacity: 0,
        duration: 0.8,
      })
        .from(
          subtextRef.current,
          {
            y: 16,
            opacity: 0,
            duration: 0.6,
          },
          "-=0.5",
        )
        .from(
          ctaRef.current,
          {
            y: 12,
            opacity: 0,
            duration: 0.5,
          },
          "-=0.4",
        )
        .from(
          previewRef.current,
          {
            y: 30,
            opacity: 0,
            duration: 0.9,
            scale: 0.98,
          },
          "-=0.5",
        );
    },
    { scope: containerRef },
  );

  return (
    <section
      ref={containerRef}
      className="relative flex flex-col items-center justify-center border-b border-sidebar-border px-4 pt-16 pb-12 text-center md:px-8 md:pt-20 md:pb-16"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center">
        <h1
          ref={headlineRef}
          className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl"
        >
          System design with code editor speed and real-time canvas
        </h1>
        <p
          ref={subtextRef}
          className="mt-4 max-w-2xl text-base text-muted md:text-lg"
        >
          Draft distributed architectures with natural prompts, live multiplayer
          sync, and automatic markdown specification generation.
        </p>

        <div
          ref={ctaRef}
          className="mt-6 flex flex-wrap items-center justify-center gap-3"
        >
          <Button asChild size="lg" className="h-11 px-6">
            <Link href="/workspace">Launch Studio</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-11 px-6">
            <a href="#workflow">Explore Workflow</a>
          </Button>
        </div>
      </div>

      <div
        ref={previewRef}
        className="mt-12 w-full max-w-5xl rounded-lg border border-sidebar-border bg-sidebar shadow-2xl overflow-hidden text-left"
      >
        <div className="flex h-9 items-center justify-between border-b border-sidebar-border bg-titlebar px-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
              <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
              <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
            </div>
            <span className="ml-2 font-mono text-muted">
              flight-sim-astra / system-architecture.canvas
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Live
              Multiplayer
            </span>
            <span className="rounded bg-hover px-1.5 py-0.5">Yjs CRDT</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 min-h-90 bg-panel">
          <div className="hidden border-r border-sidebar-border bg-sidebar/50 p-3 md:col-span-3 md:flex md:flex-col gap-2 font-mono text-xs">
            <div className="text-[11px] text-muted uppercase tracking-wider font-semibold">
              Explorer
            </div>
            <div className="flex items-center gap-1.5 rounded px-2 py-1 bg-hover text-foreground">
              <span>&#9662;</span>
              <span>flight-sim-astra</span>
            </div>
            <div className="ml-3 flex flex-col gap-1 text-muted">
              <div className="flex items-center gap-1.5 text-accent font-medium">
                <span>&#9671;</span> architecture.canvas
              </div>
              <div className="flex items-center gap-1.5">
                <span>&#9671;</span> spec-export.md
              </div>
              <div className="flex items-center gap-1.5">
                <span>&#9671;</span> event-bus.ts
              </div>
            </div>
          </div>

          <div className="relative p-6 md:col-span-6 flex flex-col justify-between overflow-hidden">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded border border-sidebar-border bg-sidebar p-3 shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>API Gateway</span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    200 OK
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  Edge routing with JWT validation
                </p>
              </div>

              <div className="rounded border border-sidebar-border bg-sidebar p-3 shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>Event Stream</span>
                  <span className="text-[10px] text-accent font-mono">
                    Kafka
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  High throughput telemetry buffer
                </p>
              </div>

              <div className="rounded border border-sidebar-border bg-sidebar p-3 shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>Workers</span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    Trigger.dev
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  Async background state synchronization
                </p>
              </div>

              <div className="rounded border border-sidebar-border bg-sidebar p-3 shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>Store</span>
                  <span className="text-[10px] text-accent font-mono">
                    PostgreSQL
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  ACID durability with Prisma ORM
                </p>
              </div>
            </div>

            <div className="mt-4 rounded border border-accent/30 bg-accent/10 p-2.5 text-xs text-foreground flex items-center justify-between">
              <span className="font-mono text-[11px] text-accent">
                Canvas sync: all peers connected (3 active cursors)
              </span>
              <span className="text-[10px] text-muted">Saved</span>
            </div>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-sidebar-border bg-sidebar/70 p-3 md:col-span-3 flex flex-col justify-between text-xs">
            <div>
              <div className="font-semibold text-foreground mb-2 flex items-center justify-between">
                <span>AI Assistant</span>
                <span className="text-[10px] text-muted font-mono">
                  Llama 3.3
                </span>
              </div>
              <div className="rounded bg-hover p-2 text-[11px] text-foreground leading-relaxed">
                Design verified. Discovered 1 critical bottleneck in the telemetry
                stream. Created ready-to-run markdown spec.
              </div>
            </div>

            <div className="mt-4 border-t border-sidebar-border pt-2 text-[11px] text-muted font-mono">
              status: ready
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
