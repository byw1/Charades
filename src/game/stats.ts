import type { Session } from './types';

/**
 * Lifetime stats and the daily streak.
 *
 * Everything is derived from stored sessions, the same way score is derived
 * from rounds: there is no counter on disk that could drift out of step with
 * the games it claims to count. A round counts once it has ended; a round
 * abandoned mid-way never happened.
 */

export type PlayStats = {
  /** Games with at least one finished round. */
  games: number;
  rounds: number;
  /** Cards guessed correctly, across every finished round. */
  cardsGuessed: number;
  /** Most cards guessed in a single round. */
  bestRound: number;
  /** Consecutive days with a finished round, ending today or yesterday. */
  streak: number;
  /** Whether today already counts toward the streak. */
  playedToday: boolean;
};

/**
 * A calendar day in the phone's own time zone, as yyyy-mm-dd. Local rather
 * than UTC because a streak is about the days the person lives in: a game at
 * 11pm counts for that evening, not for tomorrow in Greenwich.
 */
export function dayKey(at: Date): string {
  const y = at.getFullYear();
  const m = String(at.getMonth() + 1).padStart(2, '0');
  const d = String(at.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function previousDay(at: Date): Date {
  // Built from calendar parts rather than subtracting 24 hours, which is
  // wrong on the two days a year the clocks change.
  return new Date(at.getFullYear(), at.getMonth(), at.getDate() - 1, 12);
}

/**
 * Days in a row, counting back from today, on which something was played.
 *
 * A streak survives until the end of the day after the last game, so not
 * having played yet today does not break it — the same grace every streak
 * counter people already know gives them.
 */
export function streakFrom(days: ReadonlySet<string>, now: Date): number {
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  if (!days.has(dayKey(cursor))) cursor = previousDay(cursor);

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor = previousDay(cursor);
  }
  return streak;
}

export function playStats(sessions: readonly Session[], now: Date): PlayStats {
  const days = new Set<string>();
  let games = 0;
  let rounds = 0;
  let cardsGuessed = 0;
  let bestRound = 0;

  for (const session of sessions) {
    const finished = session.rounds.filter((round) => round.endedAt !== null);
    if (finished.length === 0) continue;
    games += 1;

    for (const round of finished) {
      rounds += 1;
      const correct = round.results.filter((result) => result.outcome === 'correct').length;
      cardsGuessed += correct;
      bestRound = Math.max(bestRound, correct);

      const ended = new Date(round.endedAt as string);
      if (!Number.isNaN(ended.getTime())) days.add(dayKey(ended));
    }
  }

  return {
    games,
    rounds,
    cardsGuessed,
    bestRound,
    streak: streakFrom(days, now),
    playedToday: days.has(dayKey(now)),
  };
}

export type Badge = {
  id: string;
  emoji: string;
  title: string;
  /** How to earn it, shown while it is still locked. */
  hint: string;
  earned: boolean;
};

/**
 * Small achievements, earned from the same stats. Nothing to grind and nothing
 * to buy: a few milestones that happen naturally over a handful of parties.
 */
export function badges(stats: PlayStats): Badge[] {
  return [
    { id: 'first', emoji: '🎉', title: 'First game', hint: 'Finish a round', earned: stats.rounds >= 1 },
    { id: 'ten', emoji: '🧠', title: 'Big brain', hint: '10 in one round', earned: stats.bestRound >= 10 },
    { id: 'streak3', emoji: '🔥', title: 'On a roll', hint: '3-day streak', earned: stats.streak >= 3 },
    { id: 'hundred', emoji: '💯', title: 'Hundred club', hint: '100 cards guessed', earned: stats.cardsGuessed >= 100 },
    { id: 'regular', emoji: '🪩', title: 'Party regular', hint: 'Play 10 games', earned: stats.games >= 10 },
  ];
}
