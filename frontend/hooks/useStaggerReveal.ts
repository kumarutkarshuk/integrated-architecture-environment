"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, type RefObject } from "react";

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
}

export function useStaggerReveal(
  containerRef: RefObject<HTMLElement | null>,
  {
    itemsKey,
    enabled = true,
    fromX = 0,
    fromY = 8,
  }: UseStaggerRevealOptions,
) {
  const revealedIdsRef = useRef(new Set<string>());

  useGSAP(
    () => {
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

      for (const node of newcomers) {
        const id = node.getAttribute(STAGGER_ITEM_ATTR);
        if (id) {
          revealedIdsRef.current.add(id);
        }
      }

      if (prefersReducedMotion()) {
        gsap.fromTo(
          newcomers,
          { opacity: 0 },
          { opacity: 1, duration: 0.18, ease: "none", stagger: 0.03 },
        );
        return;
      }

      gsap.fromTo(
        newcomers,
        { opacity: 0, x: fromX, y: fromY },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.38,
          stagger: 0.05,
          ease: "power2.out",
          clearProps: "transform",
          overwrite: "auto",
        },
      );
    },
    {
      scope: containerRef,
      dependencies: [itemsKey, enabled, fromX, fromY],
      revertOnUpdate: false,
    },
  );
}
