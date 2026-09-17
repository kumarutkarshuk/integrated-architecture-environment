"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
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
  const youRef = useRef<HTMLDivElement>(null);
  const agentRef = useRef<HTMLDivElement>(null);
  const teammateRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const canvas = canvasRef.current;
      const gateway = gatewayRef.current;
      const stream = streamRef.current;
      const db = dbRef.current;
      const you = youRef.current;
      const agent = agentRef.current;
      const teammate = teammateRef.current;
      if (!canvas || !gateway || !stream || !db || !you || !agent || !teammate) {
        return;
      }

      const prefersReduced =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const point = (
        node: HTMLElement,
        xRatio: number,
        yRatio: number,
      ) => {
        const box = node.getBoundingClientRect();
        const frame = canvas.getBoundingClientRect();
        return {
          x: box.left - frame.left + box.width * xRatio,
          y: box.top - frame.top + box.height * yRatio,
        };
      };

      const place = (
        cursor: HTMLElement,
        node: HTMLElement,
        xRatio: number,
        yRatio: number,
      ) => {
        const next = point(node, xRatio, yRatio);
        gsap.set(cursor, { x: next.x, y: next.y, autoAlpha: 1 });
      };

      if (prefersReduced) {
        place(you, gateway, 0.72, 0.18);
        place(agent, db, 0.18, 0.72);
        place(teammate, stream, 0.52, 0.08);
        return;
      }

      place(you, gateway, 0.72, 0.18);
      place(agent, db, 0.18, 0.72);
      place(teammate, stream, 0.52, 0.08);

      const wander = (
        cursor: HTMLElement,
        stops: Array<[HTMLElement, number, number]>,
        duration: number,
        hold: number,
      ) => {
        const tl = gsap.timeline({
          repeat: -1,
          defaults: { ease: "power1.inOut" },
          repeatRefresh: true,
        });
        for (const [node, xRatio, yRatio] of stops) {
          tl.to(cursor, {
            duration,
            x: () => point(node, xRatio, yRatio).x,
            y: () => point(node, xRatio, yRatio).y,
          }).to({}, { duration: hold });
        }
        return tl;
      };

      wander(
        you,
        [
          [stream, 0.78, 0.12],
          [db, 0.7, 0.2],
          [gateway, 0.72, 0.18],
        ],
        1.7,
        0.55,
      );
      wander(
        agent,
        [
          [stream, 0.16, 0.78],
          [gateway, 0.2, 0.7],
          [db, 0.18, 0.72],
        ],
        2.15,
        0.7,
      );
      wander(
        teammate,
        [
          [gateway, 0.45, 0.88],
          [db, 0.86, 0.48],
          [stream, 0.52, 0.08],
        ],
        1.95,
        0.8,
      );
    },
    { scope: canvasRef },
  );

  return (
    <div
      ref={canvasRef}
      className="landing-preview relative h-full min-h-36 overflow-hidden rounded-lg border border-sidebar-border bg-panel sm:min-h-56 md:min-h-72"
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

      <div className="absolute top-2 right-2 z-20 sm:top-3 sm:right-3">
        <BadgeGlow
          dotColor="bg-sky-400"
          pulse
          className="px-2 py-0.5 text-[10px]"
        >
          WebMCP
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

      <div className="relative z-10 flex h-full min-h-36 w-full min-w-0 items-center justify-center gap-2 px-3 py-3 sm:min-h-56 sm:gap-3 sm:px-4 sm:py-6 md:min-h-72 md:gap-4 md:px-5 md:py-8">
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

      <PresenceCursor
        cursorRef={youRef}
        name="You"
        color="#163a5f"
      />
      <PresenceCursor
        cursorRef={agentRef}
        name="Agent"
        color="#1b3f4d"
        highlight
      />
      <PresenceCursor
        cursorRef={teammateRef}
        name="Teammate"
        color="#134e4a"
      />
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
      className={`min-w-0 flex-1 overflow-hidden rounded-md border px-2 py-1.5 shadow-md sm:rounded-lg sm:px-3 sm:py-2.5 ${
        active
          ? "border-accent bg-sidebar shadow-accent/20"
          : "border-sidebar-border bg-sidebar"
      }`}
    >
      <p className="truncate font-mono text-[10px] font-medium text-foreground sm:text-xs">
        {title}
      </p>
      <p className="mt-0.5 truncate font-mono text-[9px] text-muted sm:mt-1 sm:text-[11px]">
        {meta}
      </p>
    </div>
  );
}

function PresenceCursor({
  cursorRef,
  name,
  color,
  highlight = false,
}: {
  cursorRef: Ref<HTMLDivElement>;
  name: string;
  color: string;
  highlight?: boolean;
}) {
  const edge = highlight ? "#7dd3fc" : "#d4d4d4";

  return (
    <div
      ref={cursorRef}
      aria-hidden
      className="pointer-events-none absolute top-0 left-0 z-20 opacity-0 will-change-transform"
      style={
        highlight
          ? { filter: "drop-shadow(0 0 6px rgb(125 211 252 / 0.65))" }
          : undefined
      }
    >
      <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
        <path
          d="M1.2 1.2 12.4 8.1 7.2 9.4 10.6 16.4 8.2 17.5 4.8 10.4 1.2 13.6V1.2Z"
          fill={color}
          stroke={edge}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="mt-0.5 ml-3 inline-block rounded-sm px-1 py-px font-mono text-[8px] text-[#e8e8e8] sm:text-[9px]"
        style={{ backgroundColor: color, border: `1px solid ${edge}` }}
      >
        {name}
      </span>
    </div>
  );
}
