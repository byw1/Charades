import { friendBoard, recentPlayers, topRivalry } from './friends';
import { makeJustPlayTeam } from './teams';
import { defaultSettings, type Round, type Session, type Team } from './types';

function team(id: string, players: string[]): Team {
  return { id, name: id === 't1' ? 'Reds' : 'Blues', color: '#FF3B47', playerNames: players, nextPlayerIndex: 0 };
}

function round(teamId: string, playerName: string | null, correct: number, id = Math.random().toString(36)): Round {
  return {
    id,
    teamId,
    playerName,
    startedAt: '2026-10-07T20:00:00Z',
    endedAt: '2026-10-07T20:01:00Z',
    results: Array.from({ length: correct }, (_, i) => ({ cardId: `d/c${i}`, outcome: 'correct' as const, atMs: i })),
  };
}

function game(id: string, createdAt: string, teams: Team[], rounds: Round[], completed = true): Session {
  return {
    id,
    deckIds: [],
    settings: defaultSettings,
    teams,
    rounds,
    seenCardIds: [],
    createdAt,
    completedAt: completed ? createdAt : null,
  };
}

const night1 = game('s1', '2026-10-01T20:00:00Z', [team('t1', ['Sam', 'Jo']), team('t2', ['Alex', 'Kai'])], [
  round('t1', 'Sam', 6),
  round('t2', 'Alex', 3),
]);
const night2 = game('s2', '2026-10-02T20:00:00Z', [team('t1', ['sam', 'Alex']), team('t2', ['Jo', 'Kai'])], [
  round('t1', 'sam', 2),
  round('t2', 'Kai', 5),
]);
const night3 = game('s3', '2026-10-03T20:00:00Z', [team('t1', ['Sam']), team('t2', ['Kai'])], [
  round('t1', 'Sam', 4),
  round('t2', 'Kai', 1),
]);

describe('friendBoard', () => {
  it('credits wins to everyone on the winning team, and cards to whoever held the phone', () => {
    const board = friendBoard([night1, night2, night3]);
    const sam = board.find((f) => f.name === 'Sam')!;
    expect(sam).toMatchObject({ games: 3, wins: 2, cardsGuessed: 12, bestRound: 6 });
    expect(board.find((f) => f.name === 'Kai')).toMatchObject({ games: 3, wins: 1, cardsGuessed: 6 });
  });

  it('treats different capitalisation as the same person, keeping the latest spelling', () => {
    const board = friendBoard([night1, night2]);
    expect(board.filter((f) => f.name.toLowerCase() === 'sam')).toHaveLength(1);
    expect(board.find((f) => f.name.toLowerCase() === 'sam')!.name).toBe('sam');
  });

  it('ranks by wins, then cards guessed', () => {
    expect(friendBoard([night1, night2, night3])[0]!.name).toBe('Sam');
  });

  it('gives nobody a win for a draw or an unfinished game', () => {
    const draw = game('s4', '2026-10-04T20:00:00Z', [team('t1', ['Sam']), team('t2', ['Kai'])], [
      round('t1', 'Sam', 2),
      round('t2', 'Kai', 2),
    ]);
    const unfinished = game('s5', '2026-10-05T20:00:00Z', [team('t1', ['Sam']), team('t2', ['Kai'])], [round('t1', 'Sam', 9)], false);
    const board = friendBoard([draw, unfinished]);
    expect(board.every((f) => f.wins === 0)).toBe(true);
    expect(board.find((f) => f.name === 'Sam')!.cardsGuessed).toBe(11);
  });

  it('crowns the top scorer when everyone played as one team', () => {
    const solo = game('s6', '2026-10-06T20:00:00Z', [makeJustPlayTeam(['Sam', 'Jo'])], [
      round('tm_1', 'Sam', 3),
      round('tm_1', 'Jo', 5),
    ]);
    const board = friendBoard([solo]);
    expect(board.find((f) => f.name === 'Jo')!.wins).toBe(1);
    expect(board.find((f) => f.name === 'Sam')!.wins).toBe(0);
  });
});

describe('recentPlayers', () => {
  it('lists the latest game’s players first, once each', () => {
    expect(recentPlayers([night1, night2, night3])).toEqual(['Sam', 'Kai', 'Alex', 'Jo']);
  });

  it('stops at the limit', () => {
    expect(recentPlayers([night1], 2)).toEqual(['Sam', 'Jo']);
  });
});

describe('topRivalry', () => {
  it('finds the pair most often on opposite sides, with the score between them', () => {
    expect(topRivalry([night1, night2, night3])).toEqual({ a: 'Kai', b: 'Sam', aWins: 1, bWins: 2, games: 3 });
  });

  it('needs at least two games to call it a rivalry', () => {
    expect(topRivalry([night3])).toBeNull();
  });
});
