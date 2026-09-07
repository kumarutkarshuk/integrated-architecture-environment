"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { LandingSection } from "./LandingSection";

const CANVAS_NODES = ["API Gateway", "Orders Service", "Postgres"];

/**
 * Two Collaborators wandering the same canvas. Paths are written as
 * percentages of the canvas, so they stay on it at any width, and are kept to
 * the bands above and below the diagram so a name never lands on a node.
 */
const CURSORS = [
  {
    name: "Ada",
    tint: "bg-accent",
    left: ["6%", "58%", "26%", "6%"],
    top: ["16%", "6%", "22%", "16%"],
    seconds: 9,
  },
  {
    name: "Grace",
    tint: "bg-ai",
    left: ["80%", "22%", "68%", "80%"],
    top: ["76%", "88%", "70%", "76%"],
    seconds: 11,
  },
];

export function CollaborationShowcase() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <LandingSection
      label="Live collaboration"
      heading="Everyone on the same canvas"
      description="Collaborators you invite by email join the live canvas. You see their cursors move as they work, and the canvas tells you whether it is saved."
    >
      <div className="surface-glass-strong canvas-grid relative h-56 overflow-hidden rounded-2xl sm:h-64">
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-wrap justify-center gap-2 px-4 sm:gap-3">
          {CANVAS_NODES.map((node, index) => (
            <span key={node} className="flex items-center gap-2 sm:gap-3">
              {index > 0 && (
                <span aria-hidden className="text-muted">
                  →
                </span>
              )}
              <span className="rounded-lg border border-glass-highlight bg-panel/80 px-3 py-2 text-xs whitespace-nowrap sm:text-sm">
                {node}
              </span>
            </span>
          ))}
        </div>

        {CURSORS.map((cursor) => (
          // Position rather than transform, because the path is a share of the
          // canvas and `x`/`y` percentages would measure the cursor instead.
          <motion.div
            key={cursor.name}
            className="absolute flex items-center gap-1.5"
            initial={{ left: cursor.left[0], top: cursor.top[0] }}
            animate={
              prefersReducedMotion
                ? { left: cursor.left[0], top: cursor.top[0] }
                : { left: cursor.left, top: cursor.top }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    duration: cursor.seconds,
                    ease: "easeInOut",
                    repeat: Infinity,
                  }
            }
          >
            <span
              aria-hidden
              className={`size-2.5 rotate-45 rounded-[2px] ${cursor.tint}`}
            />
            <span
              className={`rounded-full px-2 py-0.5 text-[0.625rem] font-medium text-ai-foreground ${cursor.tint}`}
            >
              {cursor.name}
            </span>
          </motion.div>
        ))}
      </div>
    </LandingSection>
  );
}
