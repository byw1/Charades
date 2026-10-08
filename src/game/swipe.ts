import type { Outcome } from './types';

/**
 * Swipe input: up anywhere for got it, down anywhere to pass.
 *
 * Up and down rather than left and right on purpose. The holder's hand is on a
 * screen that faces away from them, so their left is the screen's right; up
 * stays up. It also matches tap, where the top half is got it.
 *
 * A swipe has to travel far enough and be mostly vertical. A palm resting on
 * the screen, a sideways brush or a tap does nothing.
 */

/** How far a finger must travel, in points, to count. */
export const SWIPE_DISTANCE = 60;

/** A fast flick counts sooner than a slow drag. Points per millisecond. */
export const SWIPE_FLICK_SPEED = 0.6;
export const SWIPE_FLICK_DISTANCE = 28;

export function swipeOutcome(dx: number, dy: number, vy = 0): Outcome | null {
  // Mostly sideways is not an answer.
  if (Math.abs(dy) < Math.abs(dx) * 1.2) return null;

  const far = Math.abs(dy) >= SWIPE_DISTANCE;
  const flicked = Math.abs(vy) >= SWIPE_FLICK_SPEED && Math.abs(dy) >= SWIPE_FLICK_DISTANCE;
  if (!far && !flicked) return null;

  return dy < 0 ? 'correct' : 'pass';
}
