import { playerStandings, standings } from './scoring';
import { isJustPlay } from './teams';
import type { Session } from './types';

/**
 * The friend group, across every night.
 *
 * Derived from saved games like every other stat, so there is no friends list
 * to keep in sync: a name typed into a game is a friend from then on. Names
 * match case-insensitively, since "sam" and "Sam" are the same person.
 */

export type Friend = {
  name: string;
  games: number;
  wins: number;
  /** Cards guessed while this person held the phone. */
  cardsGuessed: number;
  bestRound: number;
  lastPlayed: string;
};

export type Rivalry = {
  a: string;
  b: string;
  aWins: number;
  bWins: number;
  games: number;
};

const keyOf = (name: string) => name.trim().toLocaleLowerCase();

function finishedRounds(session: Session) {
  return session.rounds.filter((round) => round.endedAt !== null);
}

/** Names of the winners of a finished game: a team's players, or the top player. */
function winnersOf(session: Session): Set<string> {
  const winners = new Set<string>();
  if (!session.completedAt || finishedRounds(session).length === 0) return winners;

  if (isJustPlay(session.teams)) {
    const table = playerStandings(session);
    // Somebody has to have lost for anyone to have won.
    if (table.length < 2) return winners;
    const top = table[0]!.score;
    if (table.every((row) => row.score === top)) return winners;
    for (const row of table) if (row.score === top) winners.add(keyOf(row.playerName));
    return winners;
  }

  const table = standings(session);
  const top = table[0]?.score;
  if (top === undefined || table.every((row) => row.score === top)) return winners;
  const winningTeams = new Set(table.filter((row) => row.score === top).map((row) => row.teamId));
  for (const team of session.teams) {
    if (winningTeams.has(team.id)) for (const name of team.playerNames) winners.add(keyOf(name));
  }
  return winners;
}

export function friendBoard(sessions: readonly Session[]): Friend[] {
  const byKey = new Map<string, Friend>();

  // Oldest first, so the name kept is the most recent spelling of it.
  const ordered = [...sessions].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const session of ordered) {
    if (finishedRounds(session).length === 0) continue;
    const winners = winnersOf(session);
    const here = new Set<string>();

    for (const team of session.teams) {
      for (const name of team.playerNames) {
        const key = keyOf(name);
        if (!key || here.has(key)) continue;
        here.add(key);

        const friend = byKey.get(key) ?? { name, games: 0, wins: 0, cardsGuessed: 0, bestRound: 0, lastPlayed: '' };
        friend.name = name.trim();
        friend.games += 1;
        if (winners.has(key)) friend.wins += 1;
        friend.lastPlayed = session.createdAt;
        byKey.set(key, friend);
      }
    }

    for (const round of finishedRounds(session)) {
      if (!round.playerName) continue;
      const friend = byKey.get(keyOf(round.playerName));
      if (!friend) continue;
      const correct = round.results.filter((result) => result.outcome === 'correct').length;
      friend.cardsGuessed += correct;
      friend.bestRound = Math.max(friend.bestRound, correct);
    }
  }

  return [...byKey.values()].sort(
    (a, b) => b.wins - a.wins || b.cardsGuessed - a.cardsGuessed || a.name.localeCompare(b.name),
  );
}

/** Everyone who has played, most recent first, for quick-adding to a game. */
export function recentPlayers(sessions: readonly Session[], limit = 16): string[] {
  const ordered = [...sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const seen = new Set<string>();
  const names: string[] = [];

  for (const session of ordered) {
    for (const team of session.teams) {
      for (const raw of team.playerNames) {
        const name = raw.trim();
        const key = keyOf(name);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        names.push(name);
        if (names.length >= limit) return names;
      }
    }
  }
  return names;
}

/**
 * The fiercest rivalry: the two people who have been on opposite sides of a
 * finished game most often, and who has the edge.
 */
export function topRivalry(sessions: readonly Session[]): Rivalry | null {
  const pairs = new Map<string, Rivalry>();

  for (const session of sessions) {
    if (!session.completedAt || isJustPlay(session.teams)) continue;
    const winners = winnersOf(session);

    const sides = session.teams.map((team) => team.playerNames.map((name) => name.trim()).filter(Boolean));
    for (let i = 0; i < sides.length; i += 1) {
      for (let j = i + 1; j < sides.length; j += 1) {
        for (const x of sides[i]!) {
          for (const y of sides[j]!) {
            const [a, b] = keyOf(x) < keyOf(y) ? [x, y] : [y, x];
            const id = `${keyOf(a)}|${keyOf(b)}`;
            const pair = pairs.get(id) ?? { a, b, aWins: 0, bWins: 0, games: 0 };
            pair.games += 1;
            if (winners.has(keyOf(a)) && !winners.has(keyOf(b))) pair.aWins += 1;
            if (winners.has(keyOf(b)) && !winners.has(keyOf(a))) pair.bWins += 1;
            pairs.set(id, pair);
          }
        }
      }
    }
  }

  let best: Rivalry | null = null;
  for (const pair of pairs.values()) {
    if (pair.games < 2) continue;
    if (!best || pair.games > best.games || (pair.games === best.games && pair.aWins + pair.bWins > best.aWins + best.bWins)) {
      best = pair;
    }
  }
  return best;
}
