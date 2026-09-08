"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useRef } from "react";
import { Button } from "../ui/button";

function ensureScrollTrigger() {
  if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
  }
}

const WORKFLOW_STEPS = [
  {
    step: "Step 1",
    title: "Draft with Natural Prompts",
    desc: "Input your target throughput, consistency requirements, and key services. The AI generates node layouts with proper directional relations.",
  },
  {
    step: "Step 2",
    title: "Collaborate on Infinite Canvas",
    desc: "Invite teammates to shape boundaries, annotate edge cases, and debate tradeoffs in real time with shared cursors.",
  },
  {
    step: "Step 3",
    title: "Export Production Specs",
    desc: "Click export to turn canvas shapes into comprehensive system architecture documents, complete with schema definitions and risk evaluations.",
  },
];

export function LandingWorkflow() {
  const containerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      ensureScrollTrigger();
      const prefersReduced =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) return;

      const steps = gsap.utils.toArray<HTMLElement>(".workflow-step");
      gsap.from(steps, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 75%",
        },
        y: 20,
        opacity: 0,
        stagger: 0.15,
        duration: 0.7,
        ease: "power2.out",
      });
    },
    { scope: containerRef },
  );

  return (
    <section
      id="workflow"
      ref={containerRef}
      className="border-b border-sidebar-border px-4 py-16 md:px-8 md:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center md:text-left">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            From concept to execution in minutes
          </h2>
          <p className="mt-3 text-base text-muted max-w-xl">
            No more disconnected drawing boards. Keep visual diagrams and written
            technical specs in perfect alignment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {WORKFLOW_STEPS.map((step, idx) => (
            <div
              key={idx}
              className="workflow-step rounded-lg border border-sidebar-border bg-sidebar p-6 flex flex-col justify-between"
            >
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
                  {step.step}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm text-muted leading-relaxed">
                  {step.desc}
                </p>
              </div>
              <div className="mt-8 border-t border-sidebar-border pt-4">
                <span className="text-xs font-mono text-muted">
                  IAE Pipeline 0{idx + 1}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-lg border border-sidebar-border bg-sidebar p-8 text-center flex flex-col items-center">
          <h3 className="text-2xl font-semibold text-foreground">
            Ready to design your next system?
          </h3>
          <p className="mt-2 text-sm text-muted max-w-md">
            Join other engineers structuring resilient distributed architectures
            with automated diagramming.
          </p>
          <div className="mt-6 flex gap-3">
            <Button asChild size="lg" className="h-11 px-8">
              <Link href="/workspace">Launch Studio</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
