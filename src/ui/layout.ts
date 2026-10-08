import { useWindowDimensions } from 'react-native';

/**
 * Below this height the screen is a phone on its side: every pixel of height
 * counts, so headers shrink, footers go side by side and big art steps back.
 */
export const SHORT_HEIGHT = 500;

/** The widest a column of reading or form content gets on a sideways phone. */
export const READABLE_WIDTH = 720;

export type Layout = {
  width: number;
  height: number;
  /** Wider than tall. */
  landscape: boolean;
  /** Too short for the portrait layout: a phone on its side. */
  short: boolean;
};

/** Pure, so the breakpoints are testable without a renderer. */
export function layoutFor(width: number, height: number): Layout {
  return { width, height, landscape: width > height, short: height < SHORT_HEIGHT };
}

/**
 * The screen's shape, re-read on every rotation. Every screen that changes
 * layout between portrait and landscape asks this rather than measuring once,
 * so turning the phone mid-screen re-lays it out instead of leaving it broken.
 */
export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  return layoutFor(width, height);
}
