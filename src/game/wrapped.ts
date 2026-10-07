import { dayKey, streakFrom } from './stats';
import { roundSeconds } from './twists';
import type { Session } from './types';

/**
 * A game night, wrapped: the numbers worth putting in a story.
 *
 * "The night" is every game with a round finished today. If nothing has been
 * played today, it is the most recent day that something was, so the recap
 * still works the morning after.
 */

export type Wrapped = {
  /** yyyy-mm-dd of the night being wrapped. */
  day: string;
  isToday: boolean;
  games: number;
  rounds: number;
  cardsGuessed: number;
  passes: number;
  busted: number;
  mvp: { name: string; cards: number } | null;
  bestRound: { name: string | null; cards: number; seconds: number } | null;
  /** The quickest correct card, from the moment it appeared. */
  fastest: { cardId: string; seconds: number; name: string | null } | null;
  mostPassed: { cardId: string; times: number } | null;
  deckIds: string[];
  streak: number;
};

function endedDay(endedAt: string | null): string | null {
  if (!endedAt) return null;
  const at = new Date(endedAt);
  return Number.isNaN(at.getTime()) ? null : dayKey(at);
}

export function wrapNight(sessions: readonly Session[], now: Date): Wrapped | null {
  const days = new Set<string>();
  for (const session of sessions) {
    for (const round of session.rounds) {
      const day = endedDay(round.endedAt);
      if (day) days.add(day);
    }
  }
  if (days.size === 0) return null;

  const today = dayKey(now);
  const day = days.has(today) ? today : [...days].sort().at(-1)!;

  let games = 0;
  let rounds = 0;
  let cardsGuessed = 0;
  let passes = 0;
  let busted = 0;
  const byPlayer = new Map<string, { name: string; cards: number }>();
  const passCounts = new Map<string, number>();
  const deckIds = new Set<string>();
  let bestRound: Wrapped['bestRound'] = null;
  let fastest: Wrapped['fastest'] = null;

  for (const session of sessions) {
    const tonight = session.rounds.filter((round) => endedDay(round.endedAt) === day);
    if (tonight.length === 0) continue;
    games += 1;
    session.deckIds.forEach((id) => deckIds.add(id));

    const teamName = new Map(session.teams.map((team) => [team.id, team.name]));
    const solo = session.teams.length === 1;

    for (const round of tonight) {
      rounds += 1;
      const who = round.playerName ?? (solo ? null : (teamName.get(round.teamId) ?? null));
      let correct = 0;
      let previous = 0;

      for (const result of round.results) {
        if (result.outcome === 'correct') {
          correct += 1;
          const seconds = Math.max(0, result.atMs - previous) / 1000;
          if (!fastest || seconds < fastest.seconds) fastest = { cardId: result.cardId, seconds, name: who };
        } else {
          passes += 1;
          if (result.busted) busted += 1;
          passCounts.set(result.cardId, (passCounts.get(result.cardId) ?? 0) + 1);
        }
        previous = result.atMs;
      }

      cardsGuessed += correct;
      if (correct > 0 && (!bestRound || correct > bestRound.cards)) {
        bestRound = { name: who, cards: correct, seconds: roundSeconds(session.settings, round.twist) };
      }

      if (round.playerName) {
        const key = round.playerName.trim().toLocaleLowerCase();
        const entry = byPlayer.get(key) ?? { name: round.playerName.trim(), cards: 0 };
        entry.cards += correct;
        byPlayer.set(key, entry);
      }
    }
  }

  let mvp: Wrapped['mvp'] = null;
  for (const entry of byPlayer.values()) {
    if (entry.cards > 0 && (!mvp || entry.cards > mvp.cards)) mvp = entry;
  }

  let mostPassed: Wrapped['mostPassed'] = null;
  for (const [cardId, times] of passCounts) {
    if (!mostPassed || times > mostPassed.times) mostPassed = { cardId, times };
  }

  return {
    day,
    isToday: day === today,
    games,
    rounds,
    cardsGuessed,
    passes,
    busted,
    mvp,
    bestRound,
    fastest,
    mostPassed,
    deckIds: [...deckIds],
    streak: streakFrom(days, now),
  };
}
