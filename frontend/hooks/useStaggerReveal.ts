"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef, type RefObject } from "react";

export const STAGGER_ITEM_ATTR = "data-stagger-item";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function staggerNodes(container: HTMLElement): HTMLElement[] {
  const nested = Array.from(
    container.querySelectorAll<HTMLElement>(`[${STAGGER_ITEM_ATTR}]`),
  );

  if (container.hasAttribute(STAGGER_ITEM_ATTR)) {
    return [container, ...nested];
  }

  return nested;
}

interface UseStaggerRevealOptions {
  itemsKey: string;
  enabled?: boolean;
  fromX?: number;
  fromY?: number;
  duration?: number;
  stagger?: number;
  ease?: string;
}

export function useStaggerReveal(
  containerRef: RefObject<HTMLElement | null>,
  {
    itemsKey,
    enabled = true,
    fromX = 0,
    fromY = 8,
    duration = 0.38,
    stagger = 0.05,
    ease = "power2.out",
  }: UseStaggerRevealOptions,
) {
  const revealedIdsRef = useRef(new Set<string>());

  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const newcomers = staggerNodes(container).filter((node) => {
      const id = node.getAttribute(STAGGER_ITEM_ATTR);
      return Boolean(id) && !revealedIdsRef.current.has(id as string);
    });

    if (newcomers.length === 0) {
      return;
    }

    const newIds: string[] = [];
    for (const node of newcomers) {
      const id = node.getAttribute(STAGGER_ITEM_ATTR);
      if (id) {
        revealedIdsRef.current.add(id);
        newIds.push(id);
      }
    }

    const reducedMotion = prefersReducedMotion();
    let completed = false;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        newcomers,
        reducedMotion ? { opacity: 0 } : { opacity: 0, x: fromX, y: fromY },
        reducedMotion
          ? {
              opacity: 1,
              duration: 0.18,
              ease: "none",
              stagger: 0.03,
              clearProps: "opacity",
              onComplete: () => {
                completed = true;
              },
            }
          : {
              opacity: 1,
              x: 0,
              y: 0,
              duration,
              stagger,
              ease,
              clearProps: "transform,opacity",
              overwrite: "auto",
              onComplete: () => {
                completed = true;
              },
            },
      );
    }, container);

    return () => {
      if (completed) {
        return;
      }

      ctx.revert();
      for (const id of newIds) {
        revealedIdsRef.current.delete(id);
      }
    };
  }, [containerRef, itemsKey, enabled, fromX, fromY, duration, stagger, ease]);
}
