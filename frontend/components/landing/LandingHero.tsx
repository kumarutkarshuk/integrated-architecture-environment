"use client";

import { GridPattern } from "../ui/grid-pattern";
import { LandingStudioPreview } from "./LandingStudioPreview";

export function LandingHero() {
  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <GridPattern
        width={32}
        height={32}
        className="opacity-30 mask-[radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]"
      />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col justify-center gap-8 px-4 py-8 md:flex-row md:items-center md:gap-10 md:px-8">
        <div className="max-w-md shrink-0">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Design systems at editor speed
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted md:text-base">
            Prompt a topology, edit it live, export a spec.
          </p>
        </div>

        <div className="min-h-72 w-full min-w-0 flex-1">
          <LandingStudioPreview />
        </div>
      </div>
    </section>
  );
}
