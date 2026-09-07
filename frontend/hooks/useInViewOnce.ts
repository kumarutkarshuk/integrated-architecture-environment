"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reports whether an element has scrolled into view, latching to true on the
 * first sighting so content never animates back out. Starts false on both the
 * server and the first client render, so hydration sees the same markup.
 */
export function useInViewOnce<T extends HTMLElement>(margin = "-12%") {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (isInView || !element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsInView(true);
        }
      },
      { rootMargin: `0px 0px ${margin} 0px` },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [isInView, margin]);

  return { ref, isInView };
}
