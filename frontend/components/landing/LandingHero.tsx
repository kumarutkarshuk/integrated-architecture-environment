"use client";

import Link from "next/link";
import { Reveal } from "../motion/Reveal";
import { Button } from "../ui/button";
import { WORKSPACE_PATH } from "../../lib/routes";

export function LandingHero({ isSignedIn }: { isSignedIn: boolean }) {
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
        <div className="mt-9 flex justify-center">
          <Button
            asChild
            size="lg"
            className="press-feedback rounded-full px-6 shadow-elevation-1"
          >
            <Link href={WORKSPACE_PATH}>
              {isSignedIn ? "Open workspace" : "Start designing"}
            </Link>
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
