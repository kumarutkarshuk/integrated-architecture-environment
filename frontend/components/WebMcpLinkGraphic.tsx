"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Bot, Layers, Radio } from "lucide-react";
import { useRef, type ReactNode, type Ref } from "react";
import { AnimatedBeam } from "./ui/animated-beam";

const TOOL_CALL = "use webmcp: create_component tool";
const ORBIT_LABELS = ["read", "draw", "link"] as const;
const ORBIT_RADIUS = 64;
const ORBIT_ICON = 26;

function anchorPoint(
  el: HTMLElement,
  root: HTMLElement,
  size: number,
  edge: "top" | "bottom",
) {
  const node = el.getBoundingClientRect();
  const frame = root.getBoundingClientRect();
  const inset = 3;
  return {
    x: node.left - frame.left + node.width / 2 - size / 2,
    y:
      edge === "top"
        ? node.top - frame.top + inset
        : node.bottom - frame.top - size - inset,
  };
}

export function WebMcpLinkGraphic() {
  const rootRef = useRef<HTMLDivElement>(null);
  const agentRef = useRef<HTMLDivElement>(null);
  const relayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const packetRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const agent = agentRef.current;
      const relay = relayRef.current;
      const canvas = canvasRef.current;
      const packet = packetRef.current;
      const status = statusRef.current;
      const ring = ringRef.current;
      if (!root || !agent || !relay || !canvas || !packet || !status || !ring) {
        return;
      }

      const prefersReduced =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (prefersReduced) {
        gsap.set(packet, { autoAlpha: 0 });
        gsap.set(status, { clipPath: "none", autoAlpha: 1 });
        return;
      }

      const packetSize = () => packet.offsetWidth || 6;
      const point = (el: HTMLElement, edge: "top" | "bottom") =>
        anchorPoint(el, root, packetSize(), edge);
      const chips = ring.querySelectorAll<HTMLElement>("[data-orbit-chip]");

      gsap.set(packet, {
        x: point(agent, "bottom").x,
        y: point(agent, "bottom").y,
        autoAlpha: 0,
      });
      gsap.set(status, { clipPath: "inset(0 100% 0 0)", autoAlpha: 1 });
      gsap.set([agent, relay, canvas], { transformOrigin: "50% 50%" });
      gsap.to(ring, {
        rotation: 360,
        duration: 18,
        repeat: -1,
        ease: "none",
      });
      gsap.to(chips, {
        rotation: "-=360",
        duration: 18,
        repeat: -1,
        ease: "none",
      });

      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        repeat: -1,
        repeatDelay: 1.1,
        repeatRefresh: true,
      });

      tl.set(status, { clipPath: "inset(0 100% 0 0)", autoAlpha: 1 })
        .fromTo(
          packet,
          {
            x: () => point(agent, "bottom").x,
            y: () => point(agent, "bottom").y,
            autoAlpha: 1,
          },
          {
            x: () => point(relay, "top").x,
            y: () => point(relay, "top").y,
            duration: 0.55,
            immediateRender: false,
          },
        )
        .to(relay, { scale: 1.04, duration: 0.16, ease: "power2.out" }, "-=0.12")
        .to(relay, { scale: 1, duration: 0.16, ease: "power2.out" })
        .fromTo(
          packet,
          {
            x: () => point(relay, "bottom").x,
            y: () => point(relay, "bottom").y,
            autoAlpha: 1,
          },
          {
            x: () => point(canvas, "top").x,
            y: () => point(canvas, "top").y,
            duration: 0.55,
            immediateRender: false,
          },
        )
        .fromTo(
          status,
          { clipPath: "inset(0 100% 0 0)", autoAlpha: 1 },
          {
            clipPath: "inset(0 0% 0 0)",
            duration: 1.15,
            ease: "power3.out",
            immediateRender: false,
          },
          "-=0.08",
        )
        .addLabel("stream", "<")
        .to(canvas, { scale: 1.04, duration: 0.16, ease: "power2.out" }, "<")
        .to(canvas, { scale: 1, duration: 0.16, ease: "power2.out" })
        .to(packet, { autoAlpha: 0, duration: 0.14, ease: "none" }, "<")
        .to(
          status,
          { autoAlpha: 0, duration: 0.35, ease: "power1.in" },
          "stream+=2.25",
        );
    },
    { scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden px-3 py-4"
    >
      <AnimatedBeam
        containerRef={rootRef}
        fromRef={agentRef}
        toRef={relayRef}
        curvature={0}
        pathWidth={1.5}
      />
      <AnimatedBeam
        containerRef={rootRef}
        fromRef={relayRef}
        toRef={canvasRef}
        curvature={0}
        pathWidth={1.5}
      />

      <span
        ref={packetRef}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 z-1 h-1.5 w-1.5 rounded-full bg-sky-400 opacity-0 will-change-transform"
      />

      <FlowNode
        nodeRef={agentRef}
        icon={<Bot className="h-3.5 w-3.5 text-muted" />}
        title="AI agent"
        meta="Cursor, Claude Code, Codex"
      />

      <div className="relative flex h-48 w-48 items-center justify-center">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full"
        >
          <circle
            cx="50%"
            cy="50%"
            r={ORBIT_RADIUS}
            fill="none"
            className="stroke-sidebar-border stroke-1"
          />
        </svg>
        <div ref={ringRef} className="pointer-events-none absolute inset-0 z-10">
          {ORBIT_LABELS.map((label, index) => {
            const angle = (360 / ORBIT_LABELS.length) * index;
            return (
              <div
                key={label}
                className="absolute top-1/2 left-1/2"
                style={{
                  width: ORBIT_ICON,
                  height: ORBIT_ICON,
                  marginLeft: -ORBIT_ICON / 2,
                  marginTop: -ORBIT_ICON / 2,
                  transform: `rotate(${angle}deg) translateY(-${ORBIT_RADIUS}px)`,
                }}
              >
                <div
                  data-orbit-chip
                  className="h-full w-full"
                  style={{ transform: `rotate(${-angle}deg)` }}
                >
                  <ToolChip>{label}</ToolChip>
                </div>
              </div>
            );
          })}
        </div>
        <div
          ref={relayRef}
          className="relative z-10 flex flex-col items-center rounded-lg border border-sky-400/40 bg-sidebar px-2.5 py-1.5"
        >
          <Radio className="h-3.5 w-3.5 text-sky-400" />
          <p className="mt-1 font-mono text-[11px] font-medium text-foreground">
            WebMCP
          </p>
        </div>
      </div>

      <FlowNode
        nodeRef={canvasRef}
        icon={<Layers className="h-3.5 w-3.5 text-accent" />}
        title="Canvas"
      />

      <p
        ref={statusRef}
        className="mx-auto min-h-5 w-fit px-1 text-center font-mono text-[10px] leading-relaxed text-sky-400/90"
      >
        {TOOL_CALL}
      </p>
    </div>
  );
}

function FlowNode({
  nodeRef,
  icon,
  title,
  meta,
}: {
  nodeRef: Ref<HTMLDivElement>;
  icon: ReactNode;
  title: string;
  meta?: string;
}) {
  return (
    <div
      ref={nodeRef}
      className="relative z-10 flex w-fit max-w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-2.5 py-2"
    >
      {icon}
      <div className="min-w-0">
        <p className="font-mono text-[11px] font-medium text-foreground">
          {title}
        </p>
        {meta ? (
          <p className="font-mono text-[10px] text-muted">{meta}</p>
        ) : null}
      </div>
    </div>
  );
}

function ToolChip({ children }: { children: string }) {
  return (
    <span className="flex h-full w-full items-center justify-center rounded-full border border-sidebar-border bg-sidebar font-mono text-[8px] text-muted">
      {children}
    </span>
  );
}
