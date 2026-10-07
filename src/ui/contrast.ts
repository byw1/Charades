import { color } from './tokens';

/**
 * Contrast helpers.
 *
 * A deck's accentColor is chosen by whoever made the deck, and it becomes the
 * full-bleed card background. Bone type is unreadable on a pale accent, so the
 * card picks its foreground rather than assuming one. The same maths backs the
 * low-contrast warning in the deck editor in M4.
 */

/** Parses #rgb or #rrggbb. Returns null on anything else. */
export function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;

  const digits = match[1]!;
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map((d) => d + d)
          .join('')
      : digits;

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** WCAG 2.1 relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const rgb = parseHexColor(hex);
  if (!rgb) return 0;

  const channel = (value: number): number => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** WCAG 2.1 contrast ratio between two colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const lumA = relativeLuminance(a);
  const lumB = relativeLuminance(b);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Picks bone or ink for text on the given background, whichever reads better.
 * Card text is huge, so WCAG large-text thresholds are the relevant bar.
 */
export function readableTextOn(background: string): string {
  return contrastRatio(background, color.bone) >= contrastRatio(background, color.ink)
    ? color.bone
    : color.ink;
}

/** WCAG AA for large text. Card text is large by definition. */
export const LARGE_TEXT_CONTRAST_MIN = 3;

/**
 * Text colour for big, heavy type on a coloured surface: deck tiles, the card
 * face, team badges.
 *
 * Prefers white whenever white clears AA large text, because white on a
 * saturated colour is the look — dark text on a vivid blue reads as a warning
 * label. Falls back to whichever option is stronger only when white genuinely
 * cannot be read, such as on yellow.
 */
export function cardTextOn(background: string): string {
  return contrastRatio(background, color.bone) >= LARGE_TEXT_CONTRAST_MIN
    ? color.bone
    : readableTextOn(background);
}

/**
 * The best available contrast for text on a given background, whichever of
 * bone or ink wins.
 *
 * Worth knowing: because bone and ink sit at opposite ends of the luminance
 * range, this never drops below about 4.45:1 for any colour — the worst case is
 * the mid grey where the two options are equally bad, and even that clears AA
 * large text. So a deck accent cannot make its own card text unreadable, and no
 * contrast warning is needed in the deck editor. The real hazard for a
 * user-chosen accent is being too close to the correct or pass flash colour,
 * which would make the full-screen state flash fail to read. The editor avoids
 * it by only offering colours from `deckColors`, which leaves green and orange
 * out; the flash also carries a large word and icon, so an imported deck in a
 * clashing colour still reads.
 */
export function bestTextContrastOn(background: string): number {
  return Math.max(contrastRatio(background, color.bone), contrastRatio(background, color.ink));
}

/**
 * The colour mixed toward black by `amount` (0 to 1). Used to draw the ledge
 * under a surface in an arbitrary deck colour, so a deck's own banner presses
 * the same way the built-in buttons do. Returns the input unchanged if it is
 * not a hex colour.
 */
export function darken(hex: string, amount = 0.22): string {
  const rgb = parseHexColor(hex);
  if (!rgb) return hex;

  const mix = (value: number) =>
    Math.round(value * (1 - Math.min(1, Math.max(0, amount))))
      .toString(16)
      .padStart(2, '0');

  return `#${mix(rgb.r)}${mix(rgb.g)}${mix(rgb.b)}`;
}
