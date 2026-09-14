"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { FileCode2 } from "lucide-react";
import { useRef, useState } from "react";
import { LandingActivityBar } from "./landing/LandingActivityBar";
import { LandingHero } from "./landing/LandingHero";
import { LandingStatusBar } from "./landing/LandingStatusBar";
import { LandingTitlebar } from "./landing/LandingTitlebar";
import { LandingWorkflow } from "./landing/LandingWorkflow";
import { CollapsibleSidebar } from "./CollapsibleSidebar";
import { RightActivityBar } from "./RightActivityBar";

export function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAiOpen, setIsAiOpen] = useState(true);

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
      ).fromTo(
        ".workspace-statusbar",
        { y: 6 },
        { y: 0, duration: 0.3, clearProps: "transform" },
        "-=0.2",
      );
    },
    { scope: containerRef },
  );

  const canvasLabel = "welcome.canvas";

  return (
    <div
      ref={containerRef}
      className="flex h-dvh flex-col overflow-hidden bg-background text-foreground select-none"
    >
      <LandingTitlebar canvasLabel={canvasLabel} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <LandingActivityBar />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-panel">
          <div className="flex h-9 shrink-0 items-center justify-between border-b border-sidebar-border bg-[#181818] px-2 text-xs">
            <div className="flex h-full min-w-0 items-center">
              <span
                title={canvasLabel}
                className="flex h-full max-w-45 items-center gap-2 border-t-2 border-t-accent border-r border-sidebar-border bg-panel px-3 font-mono text-xs text-foreground"
              >
                <FileCode2 className="h-3.5 w-3.5 shrink-0 text-accent" />
                <span className="truncate">{canvasLabel}</span>
              </span>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-auto">
            <LandingHero />
          </div>
        </main>

        <CollapsibleSidebar
          title="AI panel"
          side="right"
          isOpen={isAiOpen}
          openWidthClass="w-72"
          onToggleOpen={() => setIsAiOpen((current) => !current)}
        >
          <LandingWorkflow />
        </CollapsibleSidebar>

        <RightActivityBar
          isAiOpen={isAiOpen}
          onToggleAi={() => setIsAiOpen((current) => !current)}
        />
      </div>

      <LandingStatusBar canvasLabel={canvasLabel} />
    </div>
  );
}
