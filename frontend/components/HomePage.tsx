"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { FileCode2, FileText } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { LandingActivityBar } from "./landing/LandingActivityBar";
import { LandingHero } from "./landing/LandingHero";
import { LandingStatusBar } from "./landing/LandingStatusBar";
import { LandingTitlebar } from "./landing/LandingTitlebar";
import { LandingWorkflow } from "./landing/LandingWorkflow";
import { Button } from "./ui/button";

export function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<"overview" | "workflow">(
    "overview",
  );

  useGSAP(
    () => {
      if (typeof window === "undefined") return;

      const prefersReduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) return;

      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      tl.fromTo(
        ".workspace-titlebar",
        { y: -6 },
        { y: 0, duration: 0.35, clearProps: "transform" },
      )
        .fromTo(
          ".activity-bar-item",
          { x: -8 },
          {
            x: 0,
            stagger: 0.04,
            duration: 0.3,
            clearProps: "transform",
          },
          "-=0.2",
        )
        .fromTo(
          ".workspace-statusbar",
          { y: 6 },
          { y: 0, duration: 0.3, clearProps: "transform" },
          "-=0.2",
        );
    },
    { scope: containerRef },
  );

  const canvasLabel =
    activeSection === "overview" ? "welcome.canvas" : "workflow.md";

  return (
    <div
      ref={containerRef}
      className="flex h-dvh flex-col overflow-hidden bg-background text-foreground select-none"
    >
      <LandingTitlebar canvasLabel={canvasLabel} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <LandingActivityBar
          activeSection={activeSection}
          onNavigate={setActiveSection}
        />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-panel">
          <div className="flex h-9 shrink-0 items-center justify-between border-b border-sidebar-border bg-[#181818] px-2 text-xs">
            <div className="flex h-full min-w-0 items-center">
              <span
                title={canvasLabel}
                className="flex h-full max-w-45 items-center gap-2 border-t-2 border-t-accent border-r border-sidebar-border bg-panel px-3 font-mono text-xs text-foreground"
              >
                {activeSection === "overview" ? (
                  <FileCode2 className="h-3.5 w-3.5 shrink-0 text-accent" />
                ) : (
                  <FileText className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                )}
                <span className="truncate">{canvasLabel}</span>
              </span>
            </div>

            <Button asChild size="sm" className="active:scale-[0.97]">
              <Link href="/workspace">Open Workspace</Link>
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {activeSection === "overview" ? (
              <LandingHero />
            ) : (
              <LandingWorkflow />
            )}
          </div>
        </main>
      </div>

      <LandingStatusBar canvasLabel={canvasLabel} />
    </div>
  );
}
