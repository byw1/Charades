import { createPool, drawNext, emptyDrawerState, poolCardKey, type PoolCard } from './cardDrawer';
import { FORFEITS, forfeitFor } from './forfeits';
import { seededRandom } from './random';
import { createRound, resolveCard, start } from './round';
import { evaluateWinCondition, roundScore, standings, withOutcome } from './scoring';
import { beginRound, createSession, previousTwist, rematch } from './session';
import { fillHat, hatProgress, phaseInfo } from './threeRounds';
import { correctValue, pickTwist, roundSeconds, TWISTS, twistById } from './twists';
import { defaultSettings, type Phase, type Round, type RoundResult, type Session } from './types';

function pool(count: number): PoolCard[] {
  return createPool(
    [
      {
        id: 'dck_test',
        accentColor: '#FF3D6E',
        cards: Array.from({ length: count }, (_, i) => ({ id: `crd_${i}`, text: `Card ${i}`, note: null })),
      },
    ],
    { seed: 3 },
  );
}

function result(cardId: string, outcome: RoundResult['outcome']): RoundResult {
  return { cardId, outcome, atMs: 0 };
}

function playedRound(id: string, teamId: string, results: RoundResult[], extra: Partial<Round> = {}): Round {
  return {
    id,
    teamId,
    playerName: null,
    startedAt: '2026-10-07T20:00:00Z',
    endedAt: '2026-10-07T20:01:00Z',
    results,
    ...extra,
  };
}

function session(overrides: Partial<Session> = {}): Session {
  return {
    ...createSession({
      id: 'ses_1',
      deckIds: ['dck_test'],
      teams: [
        { id: 't1', name: 'Reds', color: '#FF3B47', playerNames: [], nextPlayerIndex: 0 },
        { id: 't2', name: 'Blues', color: '#2EA8FF', playerNames: [], nextPlayerIndex: 0 },
      ],
      settings: defaultSettings,
      now: '2026-10-07T20:00:00Z',
    }),
    ...overrides,
  };
}

describe('chaos twists', () => {
  it('has a rule for every twist, and unique ids', () => {
    expect(new Set(TWISTS.map((t) => t.id)).size).toBe(TWISTS.length);
    for (const twist of TWISTS) expect(twist.rule.length).toBeGreaterThan(0);
  });

  it('gives some rounds a twist and leaves others alone', () => {
    const random = seededRandom(7);
    const picks = Array.from({ length: 200 }, () => pickTwist(null, random));
    expect(picks.filter(Boolean).length).toBeGreaterThan(80);
    expect(picks.filter((p) => p === null).length).toBeGreaterThan(40);
  });

  it('never repeats the twist from the round before', () => {
    const random = seededRandom(11);
    let previous: string | null = null;
    for (let i = 0; i < 500; i += 1) {
      const next = pickTwist(previous, random);
      if (next !== null) expect(next).not.toBe(previous);
      previous = next ?? previous;
    }
  });

  it('doubles correct cards under double points, and only correct cards', () => {
    const results = [result('a', 'correct'), result('b', 'correct'), result('c', 'pass')];
    expect(roundScore({ results, twist: 'double' }, 1)).toBe(3);
    expect(roundScore({ results, twist: 'whisper' }, 1)).toBe(1);
    expect(roundScore({ results }, 1)).toBe(1);
    expect(correctValue('double')).toBe(2);
    expect(correctValue(undefined)).toBe(1);
  });

  it('halves the clock in a speed round, but not below fifteen seconds', () => {
    expect(roundSeconds({ roundSeconds: 60 }, 'speed')).toBe(30);
    expect(roundSeconds({ roundSeconds: 20 }, 'speed')).toBe(15);
    expect(roundSeconds({ roundSeconds: 60 }, 'hum')).toBe(60);
  });

  it('counts double points in the standings', () => {
    const s = session({
      rounds: [
        playedRound('r1', 't1', [result('a', 'correct'), result('b', 'correct')], { twist: 'double' }),
        playedRound('r2', 't2', [result('c', 'correct'), result('d', 'correct'), result('e', 'correct')]),
      ],
    });
    expect(standings(s).map((row) => [row.teamName, row.score])).toEqual([
      ['Reds', 4],
      ['Blues', 3],
    ]);
  });

  it('stamps the twist on the round and remembers it for the next', () => {
    const begun = beginRound(session(), 'r1', '2026-10-07T20:00:00Z', { twist: 'robot' });
    expect(begun.rounds[0]!.twist).toBe('robot');
    expect(previousTwist(begun)).toBeNull();

    const done = { ...begun, rounds: begun.rounds.map((r) => ({ ...r, endedAt: '2026-10-07T20:01:00Z' })) };
    expect(previousTwist(done)).toBe('robot');
    expect(twistById('robot')?.title).toBe('Robot voice');
  });
});

describe('forfeits', () => {
  it('gives the same game the same forfeit every time', () => {
    expect(forfeitFor('ses_abc')).toBe(forfeitFor('ses_abc'));
    expect(FORFEITS).toContain(forfeitFor('ses_abc'));
  });

  it('spreads forfeits across games', () => {
    const seen = new Set(Array.from({ length: 60 }, (_, i) => forfeitFor(`ses_${i}`)));
    expect(seen.size).toBeGreaterThan(15);
  });

  it('keeps every forfeit to a dare in the room', () => {
    for (const forfeit of FORFEITS) {
      expect(forfeit).not.toMatch(/drink|shot|alcohol|post|text your|send/i);
    }
  });
});

describe('drawing with retired cards', () => {
  it('skips a retired card even after the pool recycles', () => {
    const cards = pool(3);
    const keys = cards.map(poolCardKey);
    const state = { seen: [keys[0]!, keys[1]!, keys[2]!], reshuffleCount: 0 };
    const draw = drawNext(cards, state, [keys[0]!]);
    expect(draw?.reshuffled).toBe(true);
    expect(poolCardKey(draw!.card)).toBe(keys[1]);
  });

  it('returns nothing once every card is retired', () => {
    const cards = pool(2);
    expect(drawNext(cards, emptyDrawerState, cards.map(poolCardKey))).toBeNull();
  });
});

describe('a round that retires correct cards', () => {
  it('brings passes back and ends, cleared, when every card is guessed', () => {
    const cards = pool(2);
    let state = start(createRound(60_000, emptyDrawerState, { retireCorrect: true }), cards, 0);
    const first = poolCardKey(state.card!);

    state = resolveCard(state, cards, 'pass', 1_000);
    state = resolveCard(state, cards, 'correct', 2_000);
    // The passed card comes back round; the guessed one does not.
    expect(poolCardKey(state.card!)).toBe(first);

    state = resolveCard(state, cards, 'correct', 3_000);
    expect(state.phase).toBe('ended');
    expect(state.cleared).toBe(true);
    expect(state.bankedMs).toBe(3_000);
  });

  it('never clears in a normal round, which recycles instead', () => {
    const cards = pool(2);
    let state = start(createRound(60_000, emptyDrawerState), cards, 0);
    state = resolveCard(state, cards, 'correct', 1_000);
    state = resolveCard(state, cards, 'correct', 2_000);
    expect(state.phase).toBe('running');
    expect(state.cleared).toBe(false);
  });
});

describe('Taboo: busted cards', () => {
  it('records the word that gave the card away, as a pass', () => {
    const cards = pool(5);
    let state = start(createRound(60_000, emptyDrawerState), cards, 0);
    state = resolveCard(state, cards, 'pass', 1_000, { busted: 'shark' });
    expect(state.results[0]).toMatchObject({ outcome: 'pass', busted: 'shark' });
  });

  it('cannot bust a correct card', () => {
    const cards = pool(5);
    let state = start(createRound(60_000, emptyDrawerState), cards, 0);
    state = resolveCard(state, cards, 'correct', 1_000, { busted: 'shark' });
    expect(state.results[0]).not.toHaveProperty('busted');
  });

  it('drops the busted word when the recap turns it into a correct card', () => {
    const busted: RoundResult = { cardId: 'a', outcome: 'pass', atMs: 0, busted: 'shark' };
    expect(withOutcome(busted, 'correct')).toEqual({ cardId: 'a', outcome: 'correct', atMs: 0 });
    expect(withOutcome(busted, 'pass')).toEqual(busted);
  });
});

describe('three-round mode', () => {
  const hat = ['k1', 'k2', 'k3'];
  const threeRounds = { ...defaultSettings, mode: 'threeRounds' as const, winCondition: { kind: 'allPhases' as const } };

  function played(phase: Phase, guessed: string[], passed: string[] = []): Round {
    return playedRound(`r${phase}${guessed.join('')}`, 't1', [
      ...guessed.map((k) => result(k, 'correct')),
      ...passed.map((k) => result(k, 'pass')),
    ], { phase });
  }

  it('starts in phase one with the whole hat to play', () => {
    expect(hatProgress(session({ hat }))).toEqual({ done: false, phase: 1, remaining: hat, guessed: 0, total: 3 });
  });

  it('counts only correct cards towards clearing a phase', () => {
    const progress = hatProgress(session({ hat, rounds: [played(1, ['k1'], ['k2'])] }));
    expect(progress).toMatchObject({ phase: 1, remaining: ['k2', 'k3'], guessed: 1 });
  });

  it('moves on when a phase clears, across several turns', () => {
    const s = session({ hat, rounds: [played(1, ['k1']), played(1, ['k2', 'k3'])] });
    expect(hatProgress(s)).toMatchObject({ phase: 2, remaining: hat, guessed: 0 });
  });

  it('never slides back to an earlier phase after a recap edit', () => {
    // Phase two has started, then a phase one card is turned into a pass.
    const s = session({ hat, rounds: [played(1, ['k1', 'k2'], ['k3']), played(2, ['k1'])] });
    expect(hatProgress(s)).toMatchObject({ phase: 2 });
  });

  it('ends the game when phase three clears', () => {
    const s = session({
      hat,
      settings: threeRounds,
      rounds: [played(1, hat), played(2, hat), played(3, ['k1', 'k2'])],
    });
    expect(hatProgress(s)).toMatchObject({ phase: 3, remaining: ['k3'] });
    expect(evaluateWinCondition(s).over).toBe(false);

    const finished = { ...s, rounds: [...s.rounds, played(3, ['k3'])] };
    expect(hatProgress(finished)).toEqual({ done: true, total: 3 });
    expect(evaluateWinCondition(finished)).toMatchObject({ over: true, reason: 'allPhases' });
  });

  it('fills the hat with distinct cards, up to the size asked for', () => {
    const keys = Array.from({ length: 50 }, (_, i) => `k${i}`);
    const filled = fillHat(keys, 30, seededRandom(1));
    expect(filled).toHaveLength(30);
    expect(new Set(filled).size).toBe(30);
    expect(fillHat(keys.slice(0, 12), 30, seededRandom(1))).toHaveLength(12);
  });

  it('describes each phase', () => {
    expect(phaseInfo(2).title).toBe('One word');
  });

  it('stamps the phase on the round, and a rematch draws a fresh hat', () => {
    const s = createSession({ id: 'ses_2', deckIds: [], teams: session().teams, settings: threeRounds, now: 'x', hat });
    expect(beginRound(s, 'r1', 'x', { phase: 1 }).rounds[0]!.phase).toBe(1);
    expect(rematch(s, 'ses_3', 'y')).not.toHaveProperty('hat');
  });
});
