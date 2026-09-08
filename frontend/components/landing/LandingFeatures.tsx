"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

function ensureScrollTrigger() {
  if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
  }
}

export function LandingFeatures() {
  const containerRef = useRef<HTMLElement>(null);

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

  return (
    <section
      id="features"
      ref={containerRef}
      className="border-b border-sidebar-border px-4 py-16 md:px-8 md:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-12">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Engineered for technical clarity
          </h2>
          <p className="mt-3 text-base text-muted max-w-xl">
            Everything your team needs to reason about topology, throughput, and
            dependencies before writing a single line of code.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bento-item rounded-lg border border-sidebar-border bg-sidebar p-6 flex flex-col justify-between">
            <div>
              <div className="flex h-8 w-8 items-center justify-center rounded bg-accent/20 text-accent font-mono text-sm font-bold">
                01
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Prompt to Architecture
              </h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Describe requirements in plain English. The AI engine synthesizes
                scalable component boundaries, queues, and database layouts.
              </p>
            </div>
            <div className="mt-6 rounded bg-hover p-3 font-mono text-xs text-muted">
              iae generate &quot;Multi-region event stream with failover&quot;
            </div>
          </div>

          <div className="bento-item rounded-lg border border-sidebar-border bg-sidebar p-6 flex flex-col justify-between md:col-span-2">
            <div>
              <div className="flex h-8 w-8 items-center justify-center rounded bg-accent/20 text-accent font-mono text-sm font-bold">
                02
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Real-Time CRDT Canvas
              </h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Powered by Yjs and tldraw. Low-latency presence cursors, instant
                shape manipulation, and collision-free state synchronization
                across all connected teammates.
              </p>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="rounded border border-sidebar-border bg-hover p-2 text-foreground">
                Awareness API
              </div>
              <div className="rounded border border-sidebar-border bg-hover p-2 text-foreground">
                Binary Sync
              </div>
              <div className="rounded border border-sidebar-border bg-hover p-2 text-foreground">
                Offline Safe
              </div>
            </div>
          </div>

          <div className="bento-item rounded-lg border border-sidebar-border bg-sidebar p-6 flex flex-col justify-between md:col-span-2">
            <div>
              <div className="flex h-8 w-8 items-center justify-center rounded bg-accent/20 text-accent font-mono text-sm font-bold">
                03
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Architectural Spec Export
              </h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Transform boxes and connectors directly into production markdown.
                Get documented components, API payloads, data flows, and gap
                analyses ready for engineering review.
              </p>
            </div>
            <div className="mt-6 rounded border border-sidebar-border bg-panel p-3 font-mono text-xs text-muted">
              # RFC 004: Ingestion Pipeline
              <br />
              Generated 4 services, 2 queues, and 1 consensus group.
            </div>
          </div>

          <div className="bento-item rounded-lg border border-sidebar-border bg-sidebar p-6 flex flex-col justify-between">
            <div>
              <div className="flex h-8 w-8 items-center justify-center rounded bg-accent/20 text-accent font-mono text-sm font-bold">
                04
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Studio-Grade UX
              </h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Familiar code editor ergonomics with dark mode tokens, collapsible
                dock sidebars, and keyboard-first navigation.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs text-muted font-mono">
              <span>Theme: Dark VS Code</span>
              <span className="text-emerald-400">Ready</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
