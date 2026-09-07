"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface TypingLineProps {
  text: string;
  /** False leaves the line fully written, which is the frozen finished frame. */
  isTyping: boolean;
  durationSeconds: number;
  delaySeconds?: number;
  showCaret?: boolean;
  className?: string;
}

/**
 * Writes a line of text out from the left. The text is laid out in full from
 * the first frame and only clipped, so the caret can ride the same timeline
 * without either of them measuring anything.
 */
export function TypingLine({
  text,
  isTyping,
  durationSeconds,
  delaySeconds = 0,
  showCaret = false,
  className,
}: TypingLineProps) {
  const timeline = isTyping
    ? { duration: durationSeconds, delay: delaySeconds, ease: "linear" as const }
    : { duration: 0 };

  return (
    <span className={cn("relative inline-block align-top", className)}>
      <motion.span
        className="block whitespace-pre"
        initial={{ clipPath: isTyping ? "inset(0 100% 0 0)" : "inset(0 0% 0 0)" }}
        animate={{ clipPath: "inset(0 0% 0 0)" }}
        transition={timeline}
      >
        {text}
      </motion.span>

      {showCaret && (
        <motion.span
          aria-hidden
          className="absolute inset-y-0 w-0.5 bg-ai"
          initial={{ left: isTyping ? "0%" : "100%" }}
          animate={{ left: "100%" }}
          transition={timeline}
        />
      )}
    </span>
  );
}
