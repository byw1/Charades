import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';
import { createPool, poolCardKey, type PoolCard, type PoolSourceDeck } from '@/game/cardDrawer';
import { seededRandom, shuffle } from '@/game/random';
import * as round from '@/game/round';
import type { RoundState } from '@/game/round';
import { withOutcome } from '@/game/scoring';
import * as session from '@/game/session';
import { fillHat, hatProgress } from '@/game/threeRounds';
import { pickTwist, roundSeconds } from '@/game/twists';
import type { Outcome, Session, SessionSettings, Team } from '@/game/types';
import { saveSession } from '@/storage/sessionRepo';

/**
 * The live game.
 *
 * A thin shell over the pure logic in /src/game. All the rules live there; this
 * holds the current values, owns the card pool, and decides when to write to
 * disk.
 *
 * Persistence happens at round completion rather than continuously. An
 * interrupted round is not scored, and the cards it showed were never folded
 * into seenCardIds, so they return to the pool with no rollback needed.
 */

export type PlayableDeck = PoolSourceDeck & { name: string };

export type SessionStore = {
  session: Session | null;
  /** Every card the game can show. In three-round mode, the hat. */
  pool: PoolCard[];
  /**
   * What the current round draws from. The whole pool in a normal game; in
   * three-round mode, the cards still in the hat for this phase, shuffled.
   */
  roundPool: PoolCard[];
  roundState: RoundState;
  deckNames: string[];
  /** Set once the pool has been used up, for the deckExhausted win condition. */
  poolExhausted: boolean;

  startSession(input: {
    id: string;
    decks: readonly PlayableDeck[];
    teams: Team[];
    settings: SessionSettings;
    now: string;
    seed: number;
  }): Session;

  /** Rehydrates a stored session. Decks are reloaded and the pool rebuilt. */
  resumeSession(stored: Session, decks: readonly PlayableDeck[], seed: number): void;

  beginRound(roundId: string, nowIso: string, seed?: number): void;
  start(now: number): void;
  resolve(outcome: Outcome, now: number, extra?: { busted?: string }): void;
  pauseRound(now: number): void;
  resumeRound(now: number): void;
  endRound(now: number): void;
  tick(now: number): void;
  overrideResult(cardId: string, outcome: Outcome): void;

  /** Folds the round into the session and writes it. */
  commitRound(db: SQLiteDatabase, nowIso: string): Promise<Session | null>;
  completeSession(db: SQLiteDatabase, nowIso: string): Promise<void>;

  reset(): void;
};

const emptyRound: RoundState = round.createRound(60_000, { seen: [], reshuffleCount: 0 });

function poolFor(decks: readonly PlayableDeck[], settings: SessionSettings, seed: number) {
  return createPool(decks, { seed, shuffleAcrossDecks: settings.shuffleAcrossDecks });
}

/** The cards in a hat, in hat order. */
function hatCards(pool: readonly PoolCard[], hat: readonly string[]): PoolCard[] {
  const byKey = new Map(pool.map((card) => [poolCardKey(card), card]));
  return hat.flatMap((key) => {
    const card = byKey.get(key);
    return card ? [card] : [];
  });
}

const isThreeRounds = (s: Session) => s.settings.mode === 'threeRounds';

export const useSessionStore = create<SessionStore>((set, get) => ({
  session: null,
  pool: [],
  roundPool: [],
  roundState: emptyRound,
  deckNames: [],
  poolExhausted: false,

  startSession(input) {
    const all = poolFor(input.decks, input.settings, input.seed);
    const threeRounds = input.settings.mode === 'threeRounds';

    // Three-round mode fills its hat once, here, so all three phases replay
    // the same cards. It always ends when the hat clears for the third time.
    const hat = threeRounds
      ? fillHat(all.map(poolCardKey), input.settings.hatSize, seededRandom(input.seed ^ 0x5eed))
      : undefined;
    const settings: SessionSettings = threeRounds
      ? { ...input.settings, winCondition: { kind: 'allPhases' }, chaos: false }
      : input.settings;

    const created = session.createSession({
      id: input.id,
      deckIds: input.decks.map((d) => d.id),
      teams: input.teams,
      settings,
      now: input.now,
      ...(hat ? { hat } : {}),
    });

    const pool = hat ? hatCards(all, hat) : all;

    set({
      session: created,
      pool,
      roundPool: pool,
      roundState: round.createRound(input.settings.roundSeconds * 1_000, {
        seen: [],
        reshuffleCount: 0,
      }),
      deckNames: input.decks.map((d) => d.name),
      poolExhausted: false,
    });

    return created;
  },

  resumeSession(stored, decks, seed) {
    // Any round that was open when the app died is dropped, so the team whose
    // turn was interrupted takes it again from the top.
    const clean = session.discardUnfinishedRound(stored);
    const all = poolFor(decks, clean.settings, seed);
    const pool = clean.hat ? hatCards(all, clean.hat) : all;

    set({
      session: clean,
      pool,
      roundPool: pool,
      roundState: round.createRound(clean.settings.roundSeconds * 1_000, {
        seen: clean.seenCardIds,
        reshuffleCount: 0,
      }),
      deckNames: decks.map((d) => d.name),
      poolExhausted: false,
    });
  },

  beginRound(roundId, nowIso, seed = Date.now() >>> 0) {
    const current = get().session;
    if (!current) return;
    const random = seededRandom(seed);

    if (isThreeRounds(current)) {
      const progress = hatProgress(current);
      if (progress.done) return;

      // Only what is left in the hat for this phase, freshly shuffled, so the
      // next team does not start on the card the last one passed.
      const remaining = new Set(progress.remaining);
      const roundPool = shuffle(
        get().pool.filter((card) => remaining.has(poolCardKey(card))),
        random,
      );

      set({
        session: session.beginRound(current, roundId, nowIso, { phase: progress.phase }),
        roundPool,
        roundState: round.createRound(
          current.settings.roundSeconds * 1_000,
          { seen: [], reshuffleCount: 0 },
          { retireCorrect: true },
        ),
      });
      return;
    }

    const twist = current.settings.chaos ? pickTwist(session.previousTwist(current), random) : null;

    set({
      session: session.beginRound(current, roundId, nowIso, { twist }),
      roundPool: get().pool,
      roundState: round.createRound(roundSeconds(current.settings, twist) * 1_000, {
        seen: current.seenCardIds,
        reshuffleCount: 0,
      }),
    });
  },

  start(now) {
    set({ roundState: round.start(get().roundState, get().roundPool, now) });
  },

  resolve(outcome, now, extra) {
    const next = round.resolveCard(get().roundState, get().roundPool, outcome, now, extra);
    // A three-round hat emptying is the phase ending, not the decks running out.
    const exhausted = next.reshuffled && !next.retireCorrect;
    set({ roundState: next, poolExhausted: get().poolExhausted || exhausted });
  },

  pauseRound(now) {
    set({ roundState: round.pause(get().roundState, now) });
  },

  resumeRound(now) {
    set({ roundState: round.resume(get().roundState, now) });
  },

  endRound(now) {
    set({ roundState: round.end(get().roundState, now) });
  },

  tick(now) {
    const next = round.tick(get().roundState, now);
    if (next !== get().roundState) set({ roundState: next });
  },

  overrideResult(cardId, outcome) {
    set((current) => ({
      roundState: {
        ...current.roundState,
        results: current.roundState.results.map((result) =>
          result.cardId === cardId ? withOutcome(result, outcome) : result,
        ),
      },
    }));
  },

  async commitRound(db, nowIso) {
    const { session: current, roundState } = get();
    if (!current) return null;

    const committed = session.completeRound(current, {
      results: roundState.results,
      // The hat has its own bookkeeping; seen cards are for normal games.
      seenCardIds: isThreeRounds(current) ? current.seenCardIds : [...roundState.drawer.seen],
      now: nowIso,
    });

    set({ session: committed });
    await saveSession(db, committed);
    return committed;
  },

  async completeSession(db, nowIso) {
    const current = get().session;
    if (!current) return;

    const done = session.completeSession(current, nowIso);
    set({ session: done });
    await saveSession(db, done);
  },

  reset() {
    set({
      session: null,
      pool: [],
      roundPool: [],
      roundState: emptyRound,
      deckNames: [],
      poolExhausted: false,
    });
  },
}));

/** Looks a card up by its composite key, for the recap. */
export function findPoolCard(pool: readonly PoolCard[], cardId: string): PoolCard | undefined {
  return pool.find((card) => `${card.deckId}/${card.cardId}` === cardId);
}
