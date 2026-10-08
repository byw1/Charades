import { defaultSettings, type Round, type RoundResult, type Session } from './types';
import { wrapNight } from './wrapped';

function r(cardId: string, outcome: RoundResult['outcome'], atMs: number, busted?: string): RoundResult {
  return busted ? { cardId, outcome, atMs, busted } : { cardId, outcome, atMs };
}

function round(playerName: string | null, endedAt: string, results: RoundResult[], teamId = 't1'): Round {
  return { id: `${playerName}-${endedAt}`, teamId, playerName, startedAt: endedAt, endedAt, results };
}

function game(id: string, rounds: Round[], deckIds = ['dck_a']): Session {
  return {
    id,
    deckIds,
    settings: defaultSettings,
    teams: [
      { id: 't1', name: 'Reds', color: '#FF3B47', playerNames: ['Sam', 'Jo'], nextPlayerIndex: 0 },
      { id: 't2', name: 'Blues', color: '#2EA8FF', playerNames: ['Kai'], nextPlayerIndex: 0 },
    ],
    rounds,
    seenCardIds: [],
    createdAt: rounds[0]?.startedAt ?? '2026-10-07T19:00:00',
    completedAt: null,
  };
}

// Local times, so the day boundary is the phone's own.
const now = new Date(2026, 9, 7, 23, 30);
const tonight = (h: number, m = 0) => new Date(2026, 9, 7, h, m).toISOString();
const lastWeek = new Date(2026, 9, 1, 21, 0).toISOString();

describe('wrapNight', () => {
  it('returns nothing when nothing has been played', () => {
    expect(wrapNight([], now)).toBeNull();
  });

  it('wraps tonight: MVP, best round, fastest guess and most-passed card', () => {
    const sessions = [
      game('s1', [
        round('Sam', tonight(20), [r('d/jaws', 'correct', 4_000), r('d/shrek', 'correct', 5_200), r('d/platypus', 'pass', 9_000)]),
        round('Kai', tonight(20, 5), [r('d/platypus', 'pass', 2_000), r('d/frozen', 'correct', 6_000)], 't2'),
      ]),
      game('s2', [round('Jo', tonight(21), [r('d/a', 'correct', 3_000), r('d/b', 'correct', 6_000), r('d/c', 'correct', 9_000)])], ['dck_b']),
      game('s0', [round('Sam', lastWeek, [r('d/old', 'correct', 500)])]),
    ];

    const wrapped = wrapNight(sessions, now)!;
    expect(wrapped).toMatchObject({ isToday: true, games: 2, rounds: 3, cardsGuessed: 6, passes: 2 });
    expect(wrapped.mvp).toEqual({ name: 'Jo', cards: 3 });
    expect(wrapped.bestRound).toMatchObject({ name: 'Jo', cards: 3 });
    // Shrek came 1.2 seconds after Jaws; last week's half-second guess does not count.
    expect(wrapped.fastest).toEqual({ cardId: 'd/shrek', seconds: 1.2, name: 'Sam' });
    expect(wrapped.mostPassed).toEqual({ cardId: 'd/platypus', times: 2 });
    expect(wrapped.deckIds.sort()).toEqual(['dck_a', 'dck_b']);
  });

  it('falls back to the last night played when nothing has happened today', () => {
    const wrapped = wrapNight([game('s0', [round('Sam', lastWeek, [r('d/old', 'correct', 500)])])], now)!;
    expect(wrapped.isToday).toBe(false);
    expect(wrapped.cardsGuessed).toBe(1);
  });

  it('counts busted cards, and leaves an unfinished round out', () => {
    const open: Round = { ...round('Sam', tonight(22), [r('d/x', 'correct', 100)]), endedAt: null };
    const wrapped = wrapNight([game('s1', [round('Kai', tonight(21), [r('d/y', 'pass', 900, 'shark')], 't2'), open])], now)!;
    expect(wrapped.busted).toBe(1);
    expect(wrapped.cardsGuessed).toBe(0);
    expect(wrapped.mvp).toBeNull();
  });
});
