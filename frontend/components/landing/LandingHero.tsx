"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { useRef, useState } from "react";
import { BadgeGlow } from "../ui/badge-glow";
import { BorderBeam } from "../ui/border-beam";
import { Button } from "../ui/button";
import { GridPattern } from "../ui/grid-pattern";

type PreviewTab = "graph" | "flow" | "spec";

export function LandingHero() {
  const containerRef = useRef<HTMLElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtextRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<PreviewTab>("graph");
  const [selectedNode, setSelectedNode] = useState<string>("gateway");

  useGSAP(
    () => {
      const prefersReduced =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(badgeRef.current, {
        y: 16,
        opacity: 0,
        duration: 0.6,
      })
        .from(
          headlineRef.current,
          {
            y: 20,
            opacity: 0,
            duration: 0.7,
          },
          "-=0.4",
        )
        .from(
          subtextRef.current,
          {
            y: 16,
            opacity: 0,
            duration: 0.6,
          },
          "-=0.4",
        )
        .from(
          ctaRef.current,
          {
            y: 12,
            opacity: 0,
            duration: 0.5,
          },
          "-=0.3",
        )
        .from(
          previewRef.current,
          {
            y: 30,
            opacity: 0,
            duration: 0.9,
            scale: 0.98,
          },
          "-=0.4",
        );
    },
    { scope: containerRef },
  );

  return (
    <section
      ref={containerRef}
      className="relative flex flex-col items-center justify-center overflow-hidden border-b border-sidebar-border px-4 pt-14 pb-14 text-center md:px-8 md:pt-20 md:pb-20"
    >
      {/* Background 21st Grid Pattern */}
      <GridPattern
        width={36}
        height={36}
        className="mask-[radial-gradient(ellipse_70%_60%_at_50%_0%,#000_65%,transparent_100%)] opacity-40"
        squares={[
          [2, 2],
          [5, 4],
          [9, 1],
          [14, 3],
          [18, 2],
        ]}
      />

      {/* Subtle radial ambient glow */}
      <div className="pointer-events-none absolute top-10 h-72 w-96 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center">
        <div ref={badgeRef} className="mb-4">
          <BadgeGlow dotColor="bg-sky-400">
            Real-Time Architecture Studio &bull; v1.0
          </BadgeGlow>
        </div>

        <h1
          ref={headlineRef}
          className="text-3xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl"
        >
          System design with code editor speed and real-time canvas
        </h1>

        <p
          ref={subtextRef}
          className="mt-4 max-w-2xl text-sm text-muted sm:text-base md:text-lg"
        >
          Draw systems with natural prompts, collaborate live on an infinite
          canvas, and generate clean production specs in seconds.
        </p>

        <div
          ref={ctaRef}
          className="mt-6 flex flex-wrap items-center justify-center gap-3"
        >
          <Button asChild size="lg" className="h-11 px-6 shadow-md shadow-accent/20">
            <Link href="/workspace">Launch Studio</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-11 px-6">
            <a href="#workflow">Explore Workflow</a>
          </Button>
        </div>
      </div>

      {/* Studio Window Preview with 21st Border Beam */}
      <div
        ref={previewRef}
        className="relative mt-12 w-full max-w-5xl rounded-xl border border-sidebar-border bg-sidebar/95 shadow-2xl backdrop-blur-md overflow-hidden text-left"
      >
        <BorderBeam
          size={320}
          duration={12}
          colorFrom="#007acc"
          colorTo="#38bdf8"
          borderWidth={1.5}
        />

        {/* Window Titlebar */}
        <div className="flex h-10 items-center justify-between border-b border-sidebar-border bg-titlebar/90 px-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
              <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
              <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
            </div>
            <span className="ml-2 hidden font-mono text-[11px] text-muted sm:inline">
              cloud-stream / system-architecture.canvas
            </span>
          </div>

          {/* Interactive view tabs */}
          <div className="flex items-center gap-1 rounded-md bg-panel/80 p-0.5 border border-sidebar-border text-[11px]">
            <button
              onClick={() => setActiveTab("graph")}
              className={`rounded px-2.5 py-0.5 transition-colors ${
                activeTab === "graph"
                  ? "bg-hover text-foreground font-medium"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Topology Graph
            </button>
            <button
              onClick={() => setActiveTab("flow")}
              className={`rounded px-2.5 py-0.5 transition-colors ${
                activeTab === "flow"
                  ? "bg-hover text-foreground font-medium"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Data Flow
            </button>
            <button
              onClick={() => setActiveTab("spec")}
              className={`rounded px-2.5 py-0.5 transition-colors ${
                activeTab === "spec"
                  ? "bg-hover text-foreground font-medium"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Live Spec
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span className="flex items-center gap-1.5 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Multiplayer</span>
            </span>
            <span className="hidden rounded bg-hover px-1.5 py-0.5 font-mono sm:inline">
              5ms
            </span>
          </div>
        </div>

        {/* Studio Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-96 bg-panel">
          {/* File Explorer (VS Code Style) */}
          <div className="hidden border-r border-sidebar-border bg-sidebar/60 p-3 md:col-span-3 md:flex md:flex-col justify-between font-mono text-xs">
            <div className="space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-muted font-semibold">
                Project Files
              </div>
              <div className="flex items-center gap-1.5 rounded px-2 py-1 bg-hover text-foreground">
                <span>&#9662;</span>
                <span className="font-medium">cloud-stream</span>
              </div>
              <div className="ml-3 flex flex-col gap-1.5 text-muted text-[11px]">
                <div className="flex items-center gap-2 text-accent font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  architecture.canvas
                </div>
                <div className="flex items-center gap-2 hover:text-foreground cursor-pointer">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted/60" />
                  spec-export.md
                </div>
                <div className="flex items-center gap-2 hover:text-foreground cursor-pointer">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted/60" />
                  events.proto
                </div>
              </div>
            </div>

            <div className="rounded border border-sidebar-border bg-panel p-2.5 text-[11px]">
              <div className="text-muted font-semibold">Active Peers</div>
              <div className="mt-1 flex items-center justify-between text-foreground">
                <span>Sarah (Arch)</span>
                <span className="text-[10px] text-emerald-400 font-mono">Online</span>
              </div>
              <div className="flex items-center justify-between text-foreground">
                <span>Alex (DevOps)</span>
                <span className="text-[10px] text-emerald-400 font-mono">Online</span>
              </div>
            </div>
          </div>

          {/* Center Canvas Surface */}
          <div className="relative p-6 md:col-span-6 flex flex-col justify-between overflow-hidden bg-panel/70">
            {/* Simulated Live Collaborative Cursors */}
            <div className="pointer-events-none absolute top-12 left-28 z-20 flex items-center gap-1 transition-all duration-700 animate-pulse">
              <svg
                className="h-4 w-4 text-sky-400 drop-shadow"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.179z" />
              </svg>
              <span className="rounded bg-sky-500 px-1.5 py-0.5 text-[10px] font-medium text-white shadow">
                Sarah
              </span>
            </div>

            <div className="pointer-events-none absolute bottom-16 right-20 z-20 flex items-center gap-1 transition-all duration-700">
              <svg
                className="h-4 w-4 text-emerald-400 drop-shadow"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.179z" />
              </svg>
              <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-medium text-white shadow">
                Alex
              </span>
            </div>

            {/* Canvas View Content */}
            {activeTab === "spec" ? (
              <div className="h-full rounded border border-sidebar-border bg-sidebar/80 p-4 font-mono text-xs text-muted overflow-auto leading-relaxed">
                <div className="text-foreground font-semibold">
                  # RFC 102: Telemetry Ingestion Architecture
                </div>
                <div className="mt-2 text-accent">## 1. Executive Summary</div>
                <div>
                  High throughput edge pipeline buffering 120,000 telemetry events/sec
                  with guaranteed delivery and transactional state recording.
                </div>
                <div className="mt-2 text-accent">## 2. Component Boundaries</div>
                <div>- Edge API Gateway: JWT auth + rate limiting</div>
                <div>- Event Stream: Distributed Kafka cluster (3 replicas)</div>
                <div>- Workers: Trigger.dev background state processor</div>
                <div>- Database: PostgreSQL with read replicas</div>
              </div>
            ) : (
              <div className="relative my-auto grid grid-cols-2 gap-4">
                {/* SVG connection lines between nodes */}
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full stroke-accent/40"
                  fill="none"
                >
                  <line
                    x1="25%"
                    y1="25%"
                    x2="75%"
                    y2="25%"
                    strokeWidth="1.5"
                    className="animate-flow-dash"
                  />
                  <line
                    x1="25%"
                    y1="25%"
                    x2="25%"
                    y2="75%"
                    strokeWidth="1.5"
                    className="animate-flow-dash"
                  />
                  <line
                    x1="75%"
                    y1="25%"
                    x2="75%"
                    y2="75%"
                    strokeWidth="1.5"
                    className="animate-flow-dash"
                  />
                  <line
                    x1="25%"
                    y1="75%"
                    x2="75%"
                    y2="75%"
                    strokeWidth="1.5"
                    className="animate-flow-dash"
                  />
                </svg>

                {/* Node 1 */}
                <button
                  type="button"
                  onClick={() => setSelectedNode("gateway")}
                  className={`relative z-10 rounded-lg border p-3 text-left transition-all ${
                    selectedNode === "gateway"
                      ? "border-accent bg-sidebar shadow-md shadow-accent/20"
                      : "border-sidebar-border bg-sidebar/70 hover:border-sidebar-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>API Gateway</span>
                    <span className="font-mono text-[10px] text-emerald-400">
                      200 OK
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    Edge auth &bull; 4ms latency
                  </p>
                </button>

                {/* Node 2 */}
                <button
                  type="button"
                  onClick={() => setSelectedNode("kafka")}
                  className={`relative z-10 rounded-lg border p-3 text-left transition-all ${
                    selectedNode === "kafka"
                      ? "border-accent bg-sidebar shadow-md shadow-accent/20"
                      : "border-sidebar-border bg-sidebar/70 hover:border-sidebar-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>Event Stream</span>
                    <span className="font-mono text-[10px] text-accent">
                      Kafka
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    120k msg/sec &bull; 3 replicas
                  </p>
                </button>

                {/* Node 3 */}
                <button
                  type="button"
                  onClick={() => setSelectedNode("workers")}
                  className={`relative z-10 rounded-lg border p-3 text-left transition-all ${
                    selectedNode === "workers"
                      ? "border-accent bg-sidebar shadow-md shadow-accent/20"
                      : "border-sidebar-border bg-sidebar/70 hover:border-sidebar-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>Workers</span>
                    <span className="font-mono text-[10px] text-emerald-400">
                      Trigger.dev
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    Async tasks &bull; Auto-scale
                  </p>
                </button>

                {/* Node 4 */}
                <button
                  type="button"
                  onClick={() => setSelectedNode("db")}
                  className={`relative z-10 rounded-lg border p-3 text-left transition-all ${
                    selectedNode === "db"
                      ? "border-accent bg-sidebar shadow-md shadow-accent/20"
                      : "border-sidebar-border bg-sidebar/70 hover:border-sidebar-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>Database</span>
                    <span className="font-mono text-[10px] text-accent">
                      Postgres
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    ACID store &bull; Prisma ORM
                  </p>
                </button>
              </div>
            )}

            {/* Bottom mini-bar */}
            <div className="mt-4 flex items-center justify-between rounded border border-sidebar-border bg-sidebar/80 px-3 py-1.5 text-[11px] text-muted">
              <span className="font-mono text-accent">
                {activeTab === "flow"
                  ? "Active stream: 120,400 events/sec routed"
                  : "Canvas state: Yjs binary sync active"}
              </span>
              <span className="text-[10px]">Saved to cloud</span>
            </div>
          </div>

          {/* Right Panel: AI & Inspector */}
          <div className="border-t md:border-t-0 md:border-l border-sidebar-border bg-sidebar/70 p-3 md:col-span-3 flex flex-col justify-between text-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between font-semibold text-foreground">
                <span>AI Inspector</span>
                <span className="rounded bg-hover px-1.5 py-0.5 font-mono text-[10px] text-muted">
                  Llama 3.3
                </span>
              </div>

              <div className="rounded border border-sidebar-border bg-panel p-2.5 text-[11px] leading-relaxed text-muted">
                {selectedNode === "gateway" &&
                  "API Gateway has redundant routes across 3 regions. Verified zero single-point-of-failure."}
                {selectedNode === "kafka" &&
                  "Event bus configured with 3 partition leaders. Peak ingestion verified at 120k rps."}
                {selectedNode === "workers" &&
                  "Trigger.dev job handlers have automatic backoff retry policies enabled."}
                {selectedNode === "db" &&
                  "PostgreSQL instance has read-replica pooling configured for high read volume."}
              </div>

              <div className="space-y-1.5 font-mono text-[10px] text-muted">
                <div className="flex justify-between">
                  <span>Topology:</span>
                  <span className="text-foreground">Healthy</span>
                </div>
                <div className="flex justify-between">
                  <span>Latency:</span>
                  <span className="text-emerald-400">&lt; 5ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Sync Status:</span>
                  <span className="text-foreground">In Sync</span>
                </div>
              </div>
            </div>

            <Button asChild size="sm" className="mt-4 w-full text-xs">
              <Link href="/workspace">Open in Studio &rarr;</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
