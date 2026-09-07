"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { crossFade, uiSpring } from "../../lib/motion";

interface MagicRevealProps {
  children: ReactNode;
  className?: string;
  isRevealed?: boolean;
  stagger?: number;
  delay?: number;
}

/**
 * How AI-generated shapes arrive: each child scales and fades in, one after
 * the next, in the order it is written. Reduced motion drops the scale and
 * the stagger so everything simply appears.
 */
export function MagicReveal({
  children,
  className,
  isRevealed = true,
  stagger = 0.16,
  delay = 0,
}: MagicRevealProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate={isRevealed ? "revealed" : "hidden"}
      variants={{
        hidden: {},
        revealed: {
          transition: {
            staggerChildren: prefersReducedMotion ? 0 : stagger,
            delayChildren: prefersReducedMotion ? 0 : delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/** One generated shape inside a {@link MagicReveal}. */
export function MagicRevealItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: prefersReducedMotion
          ? { opacity: 0 }
          : { opacity: 0, scale: 0.88 },
        revealed: { opacity: 1, scale: 1 },
      }}
      transition={prefersReducedMotion ? crossFade : uiSpring}
    >
      {children}
    </motion.div>
  );
}
