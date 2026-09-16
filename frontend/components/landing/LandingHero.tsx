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
      className="relative flex min-h-full flex-1 flex-col items-center justify-center"
    >
      <GridPattern
        width={32}
        height={32}
        className="opacity-30 mask-[radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-start justify-center gap-6 px-4 py-5 sm:gap-8 sm:py-6 md:flex-row md:items-center md:gap-10 md:px-8">
        <div className="landing-hero-copy w-full max-w-md shrink-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Integrated Architecture Environment
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted md:text-base">
            Draw systems, share the canvas, let AI agents take control through WebMCP.
          </p>
          <Button asChild size="sm" className="mt-5">
            <Link href="/workspace">Open Workspace</Link>
          </Button>
        </div>

        <div className="min-h-56 w-full min-w-0 flex-1 sm:min-h-72">
          <LandingStudioPreview />
        </div>
      </div>
    </section>
  );
}
