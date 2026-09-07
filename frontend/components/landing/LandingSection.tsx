import type { ReactNode } from "react";
import { Reveal } from "../motion/Reveal";

interface LandingSectionProps {
  /** Landmark name, so the section is reachable without reading the demo. */
  label: string;
  heading: string;
  description: string;
  children: ReactNode;
}

export function LandingSection({
  label,
  heading,
  description,
  children,
}: LandingSectionProps) {
  return (
    <section
      aria-label={label}
      className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24"
    >
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="display-type text-2xl font-semibold sm:text-3xl">
          {heading}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
          {description}
        </p>
      </Reveal>

      <Reveal className="mt-10" delay={0.08}>
        {children}
      </Reveal>
    </section>
  );
}
