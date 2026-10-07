import { momentAt, momentsIn } from './reel';

const round = {
  results: [
    { cardId: 'd/a', outcome: 'correct' as const, atMs: 300 },
    { cardId: 'd/b', outcome: 'pass' as const, atMs: 4_000, busted: 'shark' },
    { cardId: 'd/c', outcome: 'correct' as const, atMs: 9_000 },
  ],
};

describe('momentsIn', () => {
  it('shifts each result by when the clip started, dropping any from before it', () => {
    expect(momentsIn(round, 1_000)).toEqual([
      { cardId: 'd/b', outcome: 'pass', busted: 'shark', atMs: 3_000 },
      { cardId: 'd/c', outcome: 'correct', atMs: 8_000 },
    ]);
  });
});

describe('momentAt', () => {
  const moments = momentsIn(round, 0);

  it('shows a moment for a short while after it happens', () => {
    expect(momentAt(moments, 4_500)?.cardId).toBe('d/b');
    expect(momentAt(moments, 7_000)).toBeNull();
  });

  it('shows nothing before the first moment', () => {
    expect(momentAt(moments, 100)).toBeNull();
  });
});
