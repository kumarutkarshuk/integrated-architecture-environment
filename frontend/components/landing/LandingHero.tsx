"use client";

import Link from "next/link";
import { Reveal } from "../motion/Reveal";
import { Button } from "../ui/button";
import { WORKSPACE_PATH } from "../../lib/routes";
import type { Visitor } from "./visitor";

export function LandingHero({ visitor }: { visitor: Visitor }) {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 pt-32 pb-16 text-center sm:pt-44 sm:pb-24">
      <Reveal>
        <h1 className="display-type text-[clamp(2.25rem,7vw,4.25rem)] font-semibold">
          Describe a system.
          <br />
          Watch it get drawn.
        </h1>
      </Reveal>

      <Reveal delay={0.08}>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          Integrated Architecture Environment turns a prompt into an editable
          canvas, keeps your team on it in real time, and exports a Spec that is
          honest about what is still missing.
        </p>
      </Reveal>

      <Reveal delay={0.16}>
        {/* Holds the button's height while Clerk answers, so the page below
            does not jump once the label is known. */}
        <div className="mt-9 flex h-10 justify-center">
          {visitor !== "unknown" && (
            <Button
              asChild
              size="lg"
              className="press-feedback rounded-full px-6 shadow-elevation-1"
            >
              <Link href={WORKSPACE_PATH}>
                {visitor === "signed-in" ? "Open workspace" : "Start designing"}
              </Link>
            </Button>
          )}
        </div>
      </Reveal>
    </section>
  );
}
