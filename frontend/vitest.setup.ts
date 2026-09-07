import { vi } from "vitest";

/**
 * jsdom ships no IntersectionObserver. Components use it only to know when
 * they have scrolled into view, so this stub reports everything as visible and
 * tests see the state a reader ends up in.
 */
class AlwaysIntersectingObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(private readonly onIntersect: IntersectionObserverCallback) {}

  observe(target: Element) {
    this.onIntersect(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this,
    );
  }

  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

vi.stubGlobal("IntersectionObserver", AlwaysIntersectingObserver);
