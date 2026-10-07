import { badges, dayKey, playStats, streakFrom } from './stats';
import type { Round, Session } from './types';
import { defaultSettings } from './types';

/** Noon local time on a given day, so tests pass in any time zone. */
const day = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

function round(endedAt: Date | null, correct: number, passed = 0): Round {
  return {
    id: `rnd_${Math.random()}`,
    teamId: 'tm_1',
    playerName: null,
    startedAt: (endedAt ?? day(2026, 1, 1)).toISOString(),
    endedAt: endedAt ? endedAt.toISOString() : null,
    results: [
      ...Array.from({ length: correct }, (_, i) => ({ cardId: `c${i}`, outcome: 'correct' as const, atMs: i * 1000 })),
      ...Array.from({ length: passed }, (_, i) => ({ cardId: `p${i}`, outcome: 'pass' as const, atMs: i * 1000 })),
    ],
  };
}

function session(rounds: Round[]): Session {
  return {
    id: `ses_${Math.random()}`,
    deckIds: ['dck_1'],
    settings: defaultSettings,
    teams: [{ id: 'tm_1', name: 'Everyone', color: '#FFFFFF', playerNames: [], nextPlayerIndex: 0 }],
    rounds,
    seenCardIds: [],
    createdAt: day(2026, 1, 1).toISOString(),
    completedAt: null,
  };
}

describe('dayKey', () => {
  it('formats the local calendar day', () => {
    expect(dayKey(day(2026, 3, 9))).toBe('2026-03-09');
  });

  it('puts a late-evening game on that evening, not the next day', () => {
    expect(dayKey(day(2026, 3, 9, 23))).toBe('2026-03-09');
  });
});

describe('streakFrom', () => {
  const today = day(2026, 10, 7);

  it('is zero with no games', () => {
    expect(streakFrom(new Set(), today)).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const days = new Set(['2026-10-05', '2026-10-06', '2026-10-07']);
    expect(streakFrom(days, today)).toBe(3);
  });

  it('survives until tomorrow: not having played yet today keeps yesterday’s streak', () => {
    const days = new Set(['2026-10-05', '2026-10-06']);
    expect(streakFrom(days, today)).toBe(2);
  });

  it('breaks after a whole missed day', () => {
    const days = new Set(['2026-10-04', '2026-10-05']);
    expect(streakFrom(days, today)).toBe(0);
  });

  it('stops at the first gap', () => {
    const days = new Set(['2026-10-01', '2026-10-02', '2026-10-06', '2026-10-07']);
    expect(streakFrom(days, today)).toBe(2);
  });

  it('runs across a month boundary', () => {
    const days = new Set(['2026-09-29', '2026-09-30', '2026-10-01']);
    expect(streakFrom(days, day(2026, 10, 1))).toBe(3);
  });

  it('runs across the night the clocks go back', () => {
    // Europe and the US both change clocks in late October and early November.
    const days = new Set(['2026-10-24', '2026-10-25', '2026-10-26', '2026-11-01', '2026-11-02']);
    expect(streakFrom(days, day(2026, 10, 26))).toBe(3);
    expect(streakFrom(days, day(2026, 11, 2))).toBe(2);
  });
});

describe('playStats', () => {
  const now = day(2026, 10, 7);

  it('is all zeros for a new player', () => {
    expect(playStats([], now)).toEqual({
      games: 0,
      rounds: 0,
      cardsGuessed: 0,
      bestRound: 0,
      streak: 0,
      playedToday: false,
    });
  });

  it('adds up finished rounds across games', () => {
    const stats = playStats(
      [session([round(day(2026, 10, 6), 4, 2), round(day(2026, 10, 6), 7)]), session([round(day(2026, 10, 7), 3)])],
      now,
    );
    expect(stats).toMatchObject({ games: 2, rounds: 3, cardsGuessed: 14, bestRound: 7, streak: 2, playedToday: true });
  });

  it('ignores a round that never finished', () => {
    const stats = playStats([session([round(day(2026, 10, 7), 5), round(null, 9)])], now);
    expect(stats).toMatchObject({ rounds: 1, cardsGuessed: 5, bestRound: 5 });
  });

  it('does not count a game that never got past the intro', () => {
    expect(playStats([session([round(null, 0)])], now).games).toBe(0);
  });

  it('counts passes toward nothing', () => {
    expect(playStats([session([round(day(2026, 10, 7), 0, 6)])], now).cardsGuessed).toBe(0);
  });
});

describe('badges', () => {
  const zero = { games: 0, rounds: 0, cardsGuessed: 0, bestRound: 0, streak: 0, playedToday: false };

  it('starts with everything locked', () => {
    expect(badges(zero).every((b) => !b.earned)).toBe(true);
  });

  it('unlocks each badge exactly at its threshold', () => {
    const earned = (stats: typeof zero) =>
      badges(stats)
        .filter((b) => b.earned)
        .map((b) => b.id);

    expect(earned({ ...zero, rounds: 1 })).toEqual(['first']);
    expect(earned({ ...zero, rounds: 1, bestRound: 9 })).toEqual(['first']);
    expect(earned({ ...zero, rounds: 1, bestRound: 10 })).toEqual(['first', 'ten']);
    expect(earned({ ...zero, streak: 3 })).toEqual(['streak3']);
    expect(earned({ ...zero, cardsGuessed: 100 })).toEqual(['hundred']);
    expect(earned({ ...zero, games: 10 })).toEqual(['regular']);
  });

  it('gives every badge a distinct id', () => {
    const ids = badges(zero).map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
