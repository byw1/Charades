import { ALL_EMOJI, lastEmoji, searchEmoji } from './emojiCatalog';
import { MAX_DECK_EMOJI_LENGTH } from './types';

describe('emoji catalogue', () => {
  it('only holds things a deck will accept as a cover', () => {
    for (const emoji of ALL_EMOJI) {
      expect(emoji.length).toBeLessThanOrEqual(MAX_DECK_EMOJI_LENGTH);
      expect(/\p{Extended_Pictographic}/u.test(emoji)).toBe(true);
    }
  });

  it('has no repeats', () => {
    expect(new Set(ALL_EMOJI).size).toBe(ALL_EMOJI.length);
  });
});

describe('searchEmoji', () => {
  it('finds by the start of a word', () => {
    expect(searchEmoji('piz')).toContain('🍕');
    expect(searchEmoji('BASKET')).toContain('🏀');
  });

  it('narrows with more words', () => {
    expect(searchEmoji('broken heart')).toEqual(['💔']);
  });

  it('returns everything for an empty search and nothing for nonsense', () => {
    expect(searchEmoji('  ')).toHaveLength(ALL_EMOJI.length);
    expect(searchEmoji('zzzqqq')).toEqual([]);
  });
});

describe('lastEmoji', () => {
  it('takes the latest emoji typed', () => {
    expect(lastEmoji('🍕🎤')).toBe('🎤');
    expect(lastEmoji('hello 🔥')).toBe('🔥');
  });

  it('keeps skin tones and joined emoji whole', () => {
    expect(lastEmoji('👍🏽')).toBe('👍🏽');
    expect(lastEmoji('🏳️‍🌈')).toBe('🏳️‍🌈');
  });

  it('finds nothing in plain text', () => {
    expect(lastEmoji('abc')).toBeNull();
  });
});
