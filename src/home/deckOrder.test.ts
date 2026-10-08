import { orderDecks, playCounts } from './deckOrder';

const deck = (id: string, name: string, favorite = false, updatedAt = '2026-01-01') => ({ id, name, favorite, updatedAt });

describe('orderDecks', () => {
  const decks = [deck('a', 'Animals'), deck('s', 'Sports', false, '2026-05-01'), deck('m', 'Movie Night'), deck('g', 'Gen Z Slang', true)];

  it('puts favourites first whatever the sort', () => {
    for (const sort of ['played', 'az', 'newest'] as const) {
      expect(orderDecks(decks, sort, new Map())[0]?.id).toBe('g');
    }
  });

  it('sorts by plays, falling back to the name', () => {
    const plays = new Map([['m', 4], ['s', 2]]);
    expect(orderDecks(decks, 'played', plays).map((d) => d.id)).toEqual(['g', 'm', 's', 'a']);
  });

  it('sorts A to Z, and newest first', () => {
    expect(orderDecks(decks, 'az', new Map()).map((d) => d.id)).toEqual(['g', 'a', 'm', 's']);
    expect(orderDecks(decks, 'newest', new Map()).map((d) => d.id)).toEqual(['g', 's', 'a', 'm']);
  });
});

describe('playCounts', () => {
  it('counts each game once per deck', () => {
    const counts = playCounts([{ deckIds: ['a', 'b'] }, { deckIds: ['a', 'a'] }]);
    expect(counts.get('a')).toBe(2);
    expect(counts.get('b')).toBe(1);
  });
});
