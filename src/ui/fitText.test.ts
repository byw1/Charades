import { fitCardText, wrap } from './fitText';

/** An iPhone 15 in landscape, less the card's padding and timer bar. */
const W = 852 - 96;
const H = 393 - 100;

describe('wrap', () => {
  it('keeps words together on a line while they fit', () => {
    expect(wrap('The Wizard of Oz', 10)).toEqual(['The Wizard', 'of Oz']);
  });

  it('refuses a budget a single word cannot fit in', () => {
    expect(wrap('Supercalifragilistic', 5)).toBeNull();
  });

  it('collapses runs of whitespace', () => {
    expect(wrap('  Big    Ben ', 20)).toEqual(['Big Ben']);
  });

  it('counts an emoji as one character, not two', () => {
    expect(wrap('🎬🎬🎬', 3)).toEqual(['🎬🎬🎬']);
  });
});

describe('fitCardText', () => {
  it('fills the screen for a short word', () => {
    const fit = fitCardText('Cat', W, H);
    expect(fit.fontSize).toBeGreaterThanOrEqual(150);
    expect(fit.lines).toEqual(['Cat']);
  });

  it('shrinks a long title until it fits in the box', () => {
    const fit = fitCardText('The Wizard of Oz', W, H);
    expect(fit.lines.length).toBeLessThanOrEqual(3);
    expect(fit.lines.length * fit.lineHeight).toBeLessThanOrEqual(H + fit.lines.length);
    for (const line of fit.lines) {
      expect([...line].length * fit.fontSize * 0.62).toBeLessThanOrEqual(W);
    }
  });

  it('gives a longer card a smaller size, never a larger one', () => {
    const short = fitCardText('Jaws', W, H).fontSize;
    const medium = fitCardText('Jurassic Park', W, H).fontSize;
    const long = fitCardText('Honey, I Shrunk the Kids', W, H).fontSize;
    expect(short).toBeGreaterThanOrEqual(medium);
    expect(medium).toBeGreaterThanOrEqual(long);
  });

  it('keeps even a 60-character card readable across a room', () => {
    const fit = fitCardText('Pretending to be a waiter in a very fancy restaurant tonight', W, H);
    expect(fit.fontSize).toBeGreaterThanOrEqual(40);
  });

  it('never wraps a single long word mid-word', () => {
    const fit = fitCardText('Hippopotamus', W, H);
    expect(fit.lines).toEqual(['Hippopotamus']);
  });

  it('falls back to the minimum for something that cannot fit', () => {
    const fit = fitCardText('x'.repeat(400), 100, 50);
    expect(fit.fontSize).toBe(24);
  });
});
