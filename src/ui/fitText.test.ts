import { bundledDeckDocuments } from '@/decks/bundled';
import { isEmojiCard } from '@/decks/types';
import { fitCardText, measureCard, wrap } from './fitText';

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

describe('measureCard', () => {
  it('knows a wide word from a narrow one of the same length', () => {
    expect(measureCard('Hummus')).toBeGreaterThan(measureCard('little') * 1.2);
  });

  it('gives an unknown glyph a generous width rather than zero', () => {
    expect(measureCard('Ж')).toBeGreaterThan(0.5);
  });

  it('treats an emoji as roughly square', () => {
    expect(measureCard('🎬')).toBeGreaterThan(1);
  });

  it('measures a joined or coloured emoji as the one emoji it draws', () => {
    expect(measureCard('🧙‍♂️')).toBeCloseTo(measureCard('🎬'));
    expect(measureCard('❄️')).toBeCloseTo(measureCard('🎬'));
    expect(measureCard('👍🏽')).toBeCloseTo(measureCard('🎬'));
  });
});

describe('fitCardText', () => {
  it('fits every short, wide word inside the screen at its chosen size', () => {
    // The words that broke an average-width estimate: short, so drawn huge,
    // and made of wide letters.
    for (const word of ['Doorstop', 'Hummus', 'Gump', 'Nemo', 'Mummy', 'WWE']) {
      const fit = fitCardText(word, W, H);
      expect(fit.lines).toHaveLength(1);
      expect(measureCard(word) * fit.fontSize).toBeLessThanOrEqual(W);
    }
  });

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
      expect(measureCard(line) * fit.fontSize).toBeLessThanOrEqual(W);
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

describe('bundled cards', () => {
  type Doc = { name: string; cards: { text: string; taboo?: string[] }[] };
  const cards = (bundledDeckDocuments as Doc[]).flatMap((deck) => deck.cards.map((card) => ({ deck: deck.name, ...card })));

  // The smallest phone in landscape, an iPhone SE, less the card's padding.
  const SE_W = 667 - 96;
  const SE_H = 375 - 112;

  it('fits every card on the smallest phone at a size readable across a room', () => {
    for (const card of cards) {
      // Emoji cards give a third of the height to the answer underneath.
      const h = isEmojiCard(card) ? SE_H * 0.66 : SE_H;
      const fit = fitCardText(card.text, SE_W, h);
      for (const line of fit.lines) {
        expect(measureCard(line) * fit.fontSize).toBeLessThanOrEqual(SE_W);
      }
      expect({ card: card.text, size: fit.fontSize >= 40 }).toEqual({ card: card.text, size: true });
    }
  });

  it('still fits a Taboo card in the top half, above its forbidden words', () => {
    for (const card of cards.filter((c) => c.taboo)) {
      const fit = fitCardText(card.text, SE_W, SE_H * 0.5);
      expect(fit.lines.length * fit.lineHeight).toBeLessThanOrEqual(SE_H * 0.5 + fit.lines.length);
      expect({ card: card.text, size: fit.fontSize >= 32 }).toEqual({ card: card.text, size: true });
    }
  });
});
