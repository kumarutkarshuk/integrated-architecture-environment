"use client";

import { useLoopingDemo } from "../../hooks/useLoopingDemo";
import { AiBadge } from "../ai/AiBadge";
import { AiGlow } from "../ai/AiGlow";
import { AiShimmer } from "../ai/AiShimmer";
import { MagicReveal, MagicRevealItem } from "../ai/MagicReveal";
import { CanvasNode, DEMO_NODES } from "./CanvasNode";
import { LandingSection } from "./LandingSection";
import { TypingLine } from "./TypingLine";

const PROMPT = "Checkout flow with a gateway and Postgres";
const TYPING_SECONDS = 2.4;
const REPLAY_MS = 11000;

/** What the prompt generates: the demo system, reached from a client. */
const GENERATED_NODES = ["Client", ...DEMO_NODES];

export function PromptProjectShowcase() {
  const { ref, isPlaying, replayKey, prefersReducedMotion } =
    useLoopingDemo<HTMLDivElement>(REPLAY_MS);

  return (
    <LandingSection
      label="Prompt Project"
      heading="Describe a system, and it draws itself"
      description="Create a Project in prompt mode and an AI Generation drafts a Preview. Regenerate until it reads right, then apply the Preview to unlock the live canvas."
    >
      {/* `isolate` keeps the glow's negative layer inside this box, instead of
          sliding behind the page background where nothing would see it. */}
      <div ref={ref} className="relative isolate">
        <AiGlow />

        <div
          key={replayKey}
          className="surface-glass-strong overflow-hidden rounded-2xl p-4 sm:p-6"
        >
          <AiShimmer
            isRunning={isPlaying}
            className="w-full rounded-xl bg-panel/60 px-3 py-2.5"
          >
            <span className="flex w-full min-w-0 items-center gap-2 overflow-hidden font-mono text-[0.6rem] sm:text-sm">
              {/* The label lands once the prompt is written, so the demo reads
                  as "this went to the AI" rather than as decoration. */}
              <MagicReveal isRevealed={isPlaying} delay={TYPING_SECONDS}>
                <MagicRevealItem>
                  <AiBadge />
                </MagicRevealItem>
              </MagicReveal>
              <TypingLine
                text={PROMPT}
                isTyping={!prefersReducedMotion && isPlaying}
                durationSeconds={TYPING_SECONDS}
                showCaret
              />
            </span>
          </AiShimmer>

          <MagicReveal
            isRevealed={isPlaying}
            delay={TYPING_SECONDS + 0.3}
            className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
          >
            {GENERATED_NODES.map((node, index) => (
              // The arrow shares its node's slot, so it never arrives before
              // whatever it points at.
              <MagicRevealItem key={node}>
                <CanvasNode label={node} hasIncomingArrow={index > 0} />
              </MagicRevealItem>
            ))}
          </MagicReveal>
        </div>
      </div>
    </LandingSection>
  );
}
