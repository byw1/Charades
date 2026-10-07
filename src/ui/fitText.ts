/**
 * Sizing card text to fill the screen.
 *
 * The card is the whole screen and the word should be as big as it can be
 * while still fitting. The platform's shrink-to-fit is a useful backstop but
 * not something to lean on: it behaves differently per platform and cannot
 * balance a title across lines. This picks the size up front instead.
 *
 * Pure, so it is tested without a renderer. Widths are estimated from an
 * average glyph width for the heavy rounded face rather than measured — close
 * enough that the backstop only ever nudges, never rescues.
 */

export type FitOptions = {
  /** Average glyph width as a fraction of the font size. */
  charWidth?: number;
  /** Line height as a multiple of font size. */
  lineHeight?: number;
  maxLines?: number;
  maxSize?: number;
  minSize?: number;
};

export type Fit = {
  fontSize: number;
  lineHeight: number;
  lines: string[];
};

const DEFAULTS = {
  // Nunito Black runs wide; uppercase-heavy titles more so. Slightly generous
  // so the estimate errs toward fitting.
  charWidth: 0.62,
  lineHeight: 1.08,
  maxLines: 3,
  maxSize: 180,
  minSize: 24,
};

/** Greedy word wrap to a character budget. Returns null if a word cannot fit. */
export function wrap(text: string, charsPerLine: number): string[] | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if ([...word].length > charsPerLine) return null;

    const candidate = current ? `${current} ${word}` : word;
    if ([...candidate].length <= charsPerLine) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  lines.push(current);
  return lines;
}

/**
 * The largest font size at which the text fits the box, with its lines.
 *
 * Searches downward by whole points, which is a few dozen cheap wraps per card
 * at most — well inside a frame — and gives an exact answer rather than an
 * approximate one from a bisection over a non-smooth function.
 */
export function fitCardText(text: string, width: number, height: number, options: FitOptions = {}): Fit {
  const o = { ...DEFAULTS, ...options };

  for (let size = o.maxSize; size >= o.minSize; size -= 2) {
    const charsPerLine = Math.floor(width / (size * o.charWidth));
    if (charsPerLine < 1) continue;

    const lines = wrap(text, charsPerLine);
    if (!lines || lines.length > o.maxLines) continue;
    if (lines.length * size * o.lineHeight > height) continue;

    return { fontSize: size, lineHeight: Math.round(size * o.lineHeight), lines };
  }

  // Nothing fits at the minimum: return the minimum and let the platform's
  // shrink-to-fit take the last step. Only a pathological card gets here.
  return {
    fontSize: o.minSize,
    lineHeight: Math.round(o.minSize * o.lineHeight),
    lines: wrap(text, Math.max(1, Math.floor(width / (o.minSize * o.charWidth)))) ?? [text],
  };
}
