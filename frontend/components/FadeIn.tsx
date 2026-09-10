"use client";

import { useRef, type ReactNode } from "react";
import { useStaggerReveal } from "../hooks/useStaggerReveal";

export function FadeIn({
  children,
  className,
  fromX = 0,
  fromY = 8,
}: {
  children: ReactNode;
  className?: string;
  fromX?: number;
  fromY?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useStaggerReveal(ref, { itemsKey: "in", enabled: true, fromX, fromY });

  return (
    <div ref={ref} className={className} data-stagger-item="in">
      {children}
    </div>
  );
}
