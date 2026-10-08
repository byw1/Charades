import { CARD_GLYPH_WIDTHS } from './cardFontMetrics';

/**
 * Sizing card text to fill the screen.
 *
 * The card is the whole screen and the word should be as big as it can be
 * while still fitting. The platform's shrink-to-fit is a useful backstop but
 * not something to lean on: it behaves differently per platform and cannot
 * balance a title across lines. This picks the size up front instead.
 *
 * Pure, so it is tested without a renderer. Widths come from the card face's
 * measured glyph advances rather than an average, so a short word made of wide
 * letters fits as reliably as a long one made of narrow ones.
 */

/** Width of a string at font size 1, in em. */
export type Measure = (text: string) => number;

/**
 * Tracking applied to card text, in em. Negative: the display face is drawn
 * huge, where default spacing looks loose.
 */
export const CARD_LETTER_SPACING = -0.012;

/** For anything not in the table: other scripts, accented capitals. */
const FALLBACK_GLYPH = 0.7;
/** Emoji draw roughly square. */
const EMOJI_GLYPH = 1.15;

const EMOJI = /\p{Extended_Pictographic}/u;
/**
 * Parts of an emoji that draw nothing on their own: the joiner in 🧙‍♂️, the
 * selector that asks for colour, and skin tones, which merge into the emoji
 * before them.
 */
const ZERO_WIDTH = /[\u200D\uFE0E\uFE0F]|\p{Emoji_Modifier}/u;

/** Width of card text at size 1, using the card face's real glyph widths. */
export function measureCard(text: string): number {
  const glyphs = [...text];
  let width = 0;
  let drawn = 0;
  let joined = false;
  for (const glyph of glyphs) {
    if (ZERO_WIDTH.test(glyph)) {
      // A joiner fuses the next emoji into this one: 🧙 + ♂ is one wizard.
      if (glyph === '\u200D') joined = true;
      continue;
    }
    if (joined) {
      joined = false;
      continue;
    }
    width += CARD_GLYPH_WIDTHS[glyph] ?? (EMOJI.test(glyph) ? EMOJI_GLYPH : FALLBACK_GLYPH);
    drawn += 1;
  }
  return width + CARD_LETTER_SPACING * Math.max(0, drawn - 1);
}

/** One em per character — a monospace measure, for reasoning in characters. */
const monospace: Measure = (text) => [...text].length;

export type FitOptions = {
  measure?: Measure;
  /** Line height as a multiple of font size. */
  lineHeight?: number;
  maxLines?: number;
  maxSize?: number;
  minSize?: number;
  /**
   * Fraction of the box actually used. Rendering adds a little — kerning,
   * subpixel rounding — that a table of advances cannot know about.
   */
  safety?: number;
};

export type Fit = {
  fontSize: number;
  lineHeight: number;
  lines: string[];
};

const DEFAULTS = {
  measure: measureCard,
  lineHeight: 1.05,
  maxLines: 3,
  maxSize: 180,
  minSize: 24,
  safety: 0.94,
};

/**
 * Greedy word wrap to a width, in the measure's units. Returns null if a
 * single word is wider than the line, since words are never broken.
 */
export function wrapToWidth(text: string, maxWidth: number, measure: Measure): string[] | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (measure(word) > maxWidth) return null;

    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  lines.push(current);
  return lines;
}

/** Greedy word wrap to a character budget. Returns null if a word cannot fit. */
export function wrap(text: string, charsPerLine: number): string[] | null {
  return wrapToWidth(text, charsPerLine, monospace);
}

/**
 * The largest font size at which the text fits the box, with its lines.
 *
 * Searches downward two points at a time, which is a few dozen cheap wraps per
 * card at most — well inside a frame.
 */
export function fitCardText(text: string, width: number, height: number, options: FitOptions = {}): Fit {
  const o = { ...DEFAULTS, ...options };
  const usable = width * o.safety;

  for (let size = o.maxSize; size >= o.minSize; size -= 2) {
    const lines = wrapToWidth(text, usable / size, o.measure);
    if (!lines || lines.length > o.maxLines) continue;
    if (lines.length * size * o.lineHeight > height) continue;

    return { fontSize: size, lineHeight: Math.round(size * o.lineHeight), lines };
  }

  // Nothing fits at the minimum: return the minimum and let the platform's
  // shrink-to-fit take the last step. Only a pathological card gets here.
  return {
    fontSize: o.minSize,
    lineHeight: Math.round(o.minSize * o.lineHeight),
    lines: wrapToWidth(text, usable / o.minSize, o.measure) ?? [text],
  };
}
