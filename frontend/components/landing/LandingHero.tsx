"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { useRef } from "react";
import { Button } from "../ui/button";
import { GridPattern } from "../ui/grid-pattern";
import { LandingStudioPreview } from "./LandingStudioPreview";

export function LandingHero() {
  const containerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const prefersReduced =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) return;

      gsap.fromTo(
        ".landing-hero-copy",
        { y: 10 },
        { y: 0, duration: 0.45, ease: "power2.out", clearProps: "transform" },
      );
      gsap.fromTo(
        ".landing-preview",
        { y: 12 },
        {
          y: 0,
          duration: 0.5,
          delay: 0.08,
          ease: "power2.out",
          clearProps: "transform",
        },
      );
    },
    { scope: containerRef },
  );

  return (
    <section
      ref={containerRef}
      className="relative flex h-full min-h-0 flex-col overflow-hidden"
    >
      <GridPattern
        width={32}
        height={32}
        className="opacity-30 mask-[radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]"
      />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col justify-center gap-8 px-4 py-8 md:flex-row md:items-center md:gap-10 md:px-8">
        <div className="landing-hero-copy max-w-md shrink-0">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Integrated Architecture Environment
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted md:text-base">
            Transform prompts into live, editable system topologies, collaborate
            in real time on a shared canvas, export Markdown specs for coding
            agents.
          </p>
          <Button asChild size="sm" className="mt-5">
            <Link href="/workspace">Open Workspace</Link>
          </Button>
        </div>

        <div className="min-h-72 w-full min-w-0 flex-1">
          <LandingStudioPreview />
        </div>
      </div>
    </section>
  );
}
