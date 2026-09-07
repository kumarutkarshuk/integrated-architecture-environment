"use client";

import { useEffect, useState } from "react";
import { useInViewOnce } from "./useInViewOnce";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Drives a demo that replays while it is on screen. `replayKey` is meant to be
 * a React `key`: it changes when the demo first comes into view and on every
 * replay after that, so the choreography restarts from its first frame.
 *
 * A reader who asked for reduced motion gets a `replayKey` that never changes
 * and `prefersReducedMotion` set, which together leave the demo on a finished
 * frame instead of looping at them.
 */
export function useLoopingDemo<T extends HTMLElement>(periodMs: number) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { ref, isInView } = useInViewOnce<T>();
  const [cycle, setCycle] = useState(0);
  const isLooping = isInView && !prefersReducedMotion;

  useEffect(() => {
    if (!isLooping) {
      return;
    }

    const timer = setInterval(() => {
      setCycle((current) => current + 1);
    }, periodMs);

    return () => clearInterval(timer);
  }, [isLooping, periodMs]);

  return {
    ref,
    isPlaying: isInView,
    replayKey: `${isInView}-${cycle}`,
    prefersReducedMotion,
  };
}
