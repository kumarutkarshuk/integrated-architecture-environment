"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useRef, useState } from "react";
import { BorderBeam } from "../ui/border-beam";
import { Button } from "../ui/button";

function ensureScrollTrigger() {
  if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
  }
}

const WORKFLOW_STEPS = [
  {
    step: "01",
    tag: "Prompt",
    title: "Type your requirements",
    desc: "Describe your system goals in plain words. The AI draws node boundaries and message paths.",
    code: "iae generate 'Multi-region Kafka cluster with failover'",
  },
  {
    step: "02",
    tag: "Design",
    title: "Collaborate on live canvas",
    desc: "Pan, zoom, and tweak shapes with teammates in real time using shared multiplayer cursors.",
    code: "3 teammates active • 0 merge conflicts • 5ms ping",
  },
  {
    step: "03",
    tag: "Export",
    title: "Generate production specs",
    desc: "Export clean Markdown RFCs ready for engineering review, PRs, and system audits.",
    code: "Downloaded system-spec-v1.md (4 services, 2 queues)",
  },
];

export function LandingWorkflow() {
  const containerRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);

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
        stagger: 0.12,
        duration: 0.6,
        ease: "power2.out",
      });
    },
    { scope: containerRef },
  );

  return (
    <section
      id="workflow"
      ref={containerRef}
      className="relative border-b border-sidebar-border px-4 py-16 md:px-8 md:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-12">
          <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
            Simple Workflow
          </span>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            From idea to architecture in three steps
          </h2>
          <p className="mt-2 text-sm text-muted max-w-xl md:text-base">
            No messy whiteboard exports. Keep visuals and specs aligned.
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {WORKFLOW_STEPS.map((item, idx) => {
            const isCurrent = activeStep === idx;
            return (
              <div
                key={item.step}
                onClick={() => setActiveStep(idx)}
                className={`workflow-step cursor-pointer rounded-xl border p-5 flex flex-col justify-between transition-all duration-200 ${
                  isCurrent
                    ? "border-accent bg-sidebar shadow-lg shadow-accent/10"
                    : "border-sidebar-border bg-sidebar/70 hover:border-sidebar-border/90"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded bg-accent/20 text-accent font-mono text-xs font-bold">
                      {item.step}
                    </span>
                    <span className="font-mono text-[10px] uppercase text-muted tracking-wide">
                      {item.tag}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-foreground">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs text-muted leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 rounded border border-sidebar-border bg-panel p-2 font-mono text-[10px] text-muted truncate">
                  {item.code}
                </div>
              </div>
            );
          })}
        </div>

        {/* Call to action card with 21st Border Beam */}
        <div className="relative mt-16 rounded-2xl border border-sidebar-border bg-sidebar p-8 text-center flex flex-col items-center overflow-hidden md:p-12">
          <BorderBeam
            size={280}
            duration={10}
            colorFrom="#007acc"
            colorTo="#38bdf8"
            borderWidth={1.5}
          />

          <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
            Ready to Build
          </span>
          <h3 className="mt-2 text-2xl font-semibold text-foreground md:text-3xl">
            Start designing distributed systems today
          </h3>
          <p className="mt-2 text-sm text-muted max-w-md">
            Open the studio right in your browser. No local setup required.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" className="h-11 px-8 shadow-md shadow-accent/20">
              <Link href="/workspace">Launch Studio</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
