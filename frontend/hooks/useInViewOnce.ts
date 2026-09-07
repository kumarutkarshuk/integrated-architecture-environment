"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reports whether an element has scrolled into view, latching to true on the
 * first sighting so content never animates back out. Starts false on both the
 * server and the first client render, so hydration sees the same markup.
 */
/** Waits until the element is a little way onto the screen before firing. */
const VIEW_MARGIN = "0px 0px -12% 0px";

export function useInViewOnce<T extends HTMLElement>() {
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
      { rootMargin: VIEW_MARGIN },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [isInView]);

  return { ref, isInView };
}
