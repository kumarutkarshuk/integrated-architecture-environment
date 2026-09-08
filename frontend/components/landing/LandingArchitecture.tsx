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

const STACK_LAYERS = [
  {
    layer: "01 Client Surface",
    tech: "Next.js 16 + React 19 + tldraw + Tailwind CSS",
    detail:
      "Interactive infinite canvas with custom VS Code-inspired window frames, dark palette tokens, and responsive sidebars.",
  },
  {
    layer: "02 Collaboration Engine",
    tech: "Yjs CRDT + WebSocket Provider",
    detail:
      "Deterministic distributed document merge with live presence awareness, broadcast updates, and automatic reconnection.",
  },
  {
    layer: "03 Application API",
    tech: "Node Express + Prisma ORM + PostgreSQL",
    detail:
      "Secure room mapping, user project relations, token verification via Clerk, and transactional canvas snapshots.",
  },
  {
    layer: "04 Background AI Pipeline",
    tech: "Trigger.dev + Groq & OpenRouter",
    detail:
      "Async job runners handling complex shape placement calculations, text analysis, and markdown specification generation.",
  },
];

export function LandingArchitecture() {
  const containerRef = useRef<HTMLElement>(null);

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
        x: -20,
        opacity: 0,
        stagger: 0.12,
        duration: 0.6,
        ease: "power2.out",
      });
    },
    { scope: containerRef },
  );

  return (
    <section
      id="architecture"
      ref={containerRef}
      className="border-b border-sidebar-border px-4 py-16 md:px-8 md:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-12">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Clean architectural foundation
          </h2>
          <p className="mt-3 text-base text-muted max-w-xl">
            Built from scratch for resilience and high throughput collaboration.
          </p>
        </div>

        <div className="space-y-4">
          {STACK_LAYERS.map((item, idx) => (
            <div
              key={idx}
              className="arch-card flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-lg border border-sidebar-border bg-sidebar p-5 transition-colors hover:border-accent/50"
            >
              <div className="md:w-1/3">
                <span className="font-mono text-xs font-semibold text-accent">
                  {item.layer}
                </span>
                <h3 className="mt-1 font-mono text-sm font-medium text-foreground">
                  {item.tech}
                </h3>
              </div>
              <div className="md:w-2/3">
                <p className="text-sm text-muted leading-relaxed">
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
