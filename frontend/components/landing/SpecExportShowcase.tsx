"use client";

import { useLoopingDemo } from "../../hooks/useLoopingDemo";
import { AiBadge } from "../ai/AiBadge";
import { CanvasNode, DEMO_NODES } from "./CanvasNode";
import { LandingSection } from "./LandingSection";
import { TypingLine } from "./TypingLine";

const LINE_SECONDS = 0.5;
const REPLAY_MS = 12000;

/** The Spec as v1 writes it: a frozen write-up, then what it could not find. */
const SPEC_LINES = [
  { text: "# Checkout Flow", isGap: false },
  { text: "", isGap: false },
  { text: "## Components", isGap: false },
  { text: "- API Gateway — routes public traffic", isGap: false },
  { text: "- Orders Service — owns checkout", isGap: false },
  { text: "- Postgres — orders and payments", isGap: false },
  { text: "", isGap: false },
  { text: "## Gaps", isGap: true },
  { text: "- No cache between gateway and database", isGap: true },
  { text: "- Auth boundary inferred, not drawn", isGap: true },
];

export function SpecExportShowcase() {
  const { ref, isPlaying, replayKey, prefersReducedMotion } =
    useLoopingDemo<HTMLDivElement>(REPLAY_MS);

  return (
    <LandingSection
      label="Spec export"
      heading="Export a Spec that admits what is missing"
      description="A Spec freezes the canvas as it was the moment you asked, writes it up in markdown, and ends with a gaps summary for everything it had to infer."
    >
      <div ref={ref}>
        <div key={replayKey} className="grid gap-4 sm:grid-cols-2">
          <div className="surface-glass flex flex-col gap-3 rounded-2xl p-4 sm:p-6">
            <span className="text-xs text-muted">Canvas</span>
            <div className="flex flex-1 flex-col justify-center gap-2">
              {DEMO_NODES.map((node) => (
                <CanvasNode key={node} label={node} />
              ))}
            </div>
            <span className="flex items-center gap-2 self-start rounded-full bg-panel/70 px-3 py-1.5 text-xs">
              <AiBadge />
              Export Spec
            </span>
          </div>

          <div className="surface-glass-strong overflow-hidden rounded-2xl p-4 font-mono text-[0.7rem] leading-relaxed sm:p-6 sm:text-xs">
            <span className="font-sans text-xs text-muted">checkout-flow.md</span>
            <div className="mt-3 flex flex-col">
              {SPEC_LINES.map((line, index) => (
                <TypingLine
                  key={line.text || `blank-${index}`}
                  text={line.text || " "}
                  isTyping={!prefersReducedMotion && isPlaying}
                  durationSeconds={LINE_SECONDS}
                  delaySeconds={index * LINE_SECONDS}
                  className={line.isGap ? "text-ai" : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </LandingSection>
  );
}
