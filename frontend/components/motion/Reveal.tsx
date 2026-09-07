"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useInViewOnce } from "../../hooks/useInViewOnce";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { crossFade, uiSpring } from "../../lib/motion";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Settles a block of content into place the first time it is scrolled into
 * view. Reduced motion turns the rise into a plain cross-fade.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { ref, isInView } = useInViewOnce<HTMLDivElement>();
  // Reduced motion waits in place, so the reveal is a fade and nothing travels.
  const restingOffset = prefersReducedMotion ? 0 : 24;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: restingOffset }}
      animate={
        isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: restingOffset }
      }
      transition={{
        ...(prefersReducedMotion ? crossFade : uiSpring),
        delay: prefersReducedMotion ? 0 : delay,
      }}
    >
      {children}
    </motion.div>
  );
}
