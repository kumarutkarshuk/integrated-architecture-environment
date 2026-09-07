import type { Transition } from "motion/react";

/**
 * Settles on the target without overshoot. The default for anything the user
 * did not throw: reveals, hovers, panels opening from a click.
 */
export const uiSpring: Transition = {
  type: "spring",
  bounce: 0,
  duration: 0.4,
};

/**
 * A little overshoot, earned only by a gesture that carried momentum
 * (a flick, a drag release). Never use it for something that merely appeared.
 */
export const momentumSpring: Transition = {
  type: "spring",
  bounce: 0.2,
  duration: 0.4,
};

/** What every spring above becomes when the user asks for reduced motion. */
export const crossFade: Transition = {
  duration: 0.2,
  ease: "easeOut",
};

/**
 * Where a flick would come to rest, using the exponential decay form Apple
 * ships in Designing Fluid Interfaces rather than the textbook v^2/(2a).
 * Snap to the target nearest this point instead of the nearest to the release.
 */
export function projectMomentum(
  velocity: number,
  decelerationRate = 0.998,
): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Progressive resistance past a boundary, so an edge reads as "nothing more
 * here" rather than "frozen". `overshoot` is how far past the bound the
 * pointer has travelled; `dimension` is the size of the axis being dragged.
 */
export function rubberband(
  overshoot: number,
  dimension: number,
  constant = 0.55,
): number {
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  );
}
