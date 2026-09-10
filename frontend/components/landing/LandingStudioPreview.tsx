"use client";

import { useRef, type Ref } from "react";
import { AnimatedBeam } from "../ui/animated-beam";
import { BadgeGlow } from "../ui/badge-glow";
import { BorderBeam } from "../ui/border-beam";
import { GridPattern } from "../ui/grid-pattern";

export function LandingStudioPreview() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const gatewayRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const dbRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={canvasRef}
      className="landing-preview relative h-full min-h-72 overflow-hidden rounded-lg border border-sidebar-border bg-panel"
    >
      <BorderBeam
        size={64}
        duration={10}
        colorFrom="#007acc"
        colorTo="#38bdf8"
        borderWidth={1.5}
      />
      <GridPattern
        width={28}
        height={28}
        className="opacity-30 mask-[radial-gradient(ellipse_70%_60%_at_50%_45%,#000_65%,transparent_100%)]"
      />

      <div className="absolute top-3 right-3 z-20">
        <BadgeGlow
          dotColor="bg-emerald-400"
          pulse
          className="px-2 py-0.5 text-[10px]"
        >
          CRDT Live
        </BadgeGlow>
      </div>

      <AnimatedBeam
        containerRef={canvasRef}
        fromRef={gatewayRef}
        toRef={streamRef}
        curvature={18}
        pathWidth={2}
      />
      <AnimatedBeam
        containerRef={canvasRef}
        fromRef={streamRef}
        toRef={dbRef}
        curvature={-18}
        pathWidth={2}
      />

      <div className="relative z-10 flex h-full min-h-72 items-center justify-center gap-3 px-4 py-8 md:gap-6 md:px-6">
        <CanvasNode
          nodeRef={gatewayRef}
          title="API Gateway"
          meta="Prompt intake"
        />
        <CanvasNode
          nodeRef={streamRef}
          title="Event Stream"
          meta="Kafka"
          active
        />
        <CanvasNode nodeRef={dbRef} title="Postgres" meta="ACID store" />
      </div>
    </div>
  );
}

function CanvasNode({
  nodeRef,
  title,
  meta,
  active = false,
}: {
  nodeRef: Ref<HTMLDivElement>;
  title: string;
  meta: string;
  active?: boolean;
}) {
  return (
    <div
      ref={nodeRef}
      title={`${title} - ${meta}`}
      className={`min-w-28 rounded-lg border px-3 py-3 shadow-md ${
        active
          ? "border-accent bg-sidebar shadow-accent/20"
          : "border-sidebar-border bg-sidebar"
      }`}
    >
      <p className="font-mono text-xs font-medium text-foreground">{title}</p>
      <p className="mt-1 font-mono text-[11px] text-muted">{meta}</p>
    </div>
  );
}
