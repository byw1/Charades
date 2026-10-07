import { shuffle, type Random } from './random';
import type { Phase, Round, Session } from './types';

/**
 * Three-round mode.
 *
 * One hat of cards, played three times. Phase one, the room describes each
 * card any way it likes. Phase two, one word per card. Phase three, no words
 * at all. Everyone has heard the cards by phase three, which is what makes a
 * single gesture land and is most of the fun.
 *
 * A phase ends when every card in the hat has been guessed in it. Passed cards
 * go back in the hat. Turns rotate as usual, and the game ends when phase
 * three clears.
 */

export type PhaseInfo = { phase: Phase; emoji: string; title: string; rule: string };

export const PHASES: readonly PhaseInfo[] = [
  { phase: 1, emoji: '🗣️', title: 'Say anything', rule: 'Describe it any way you like. Remember the cards: they come back.' },
  { phase: 2, emoji: '☝️', title: 'One word', rule: 'One word per card. That’s it. Make it count.' },
  { phase: 3, emoji: '🎭', title: 'Act it out', rule: 'No words, no sounds. Pure charades.' },
];

export function phaseInfo(phase: Phase): PhaseInfo {
  return PHASES[phase - 1]!;
}

export type HatProgress =
  | {
      done: false;
      phase: Phase;
      /** Composite keys still to be guessed in this phase. */
      remaining: string[];
      guessed: number;
      total: number;
    }
  | { done: true; total: number };

/** Cards guessed correctly in a phase, across every completed round of it. */
function guessedIn(rounds: readonly Round[], phase: Phase): Set<string> {
  const guessed = new Set<string>();
  for (const round of rounds) {
    if (round.phase !== phase || round.endedAt === null) continue;
    for (const result of round.results) {
      if (result.outcome === 'correct') guessed.add(result.cardId);
    }
  }
  return guessed;
}

/**
 * Where the hat stands.
 *
 * The current phase is the latest one any round has been played in, so a
 * recap edit to an old round cannot drag the game back to an earlier phase.
 * If that phase's hat is empty, the game moves on to the next.
 */
export function hatProgress(session: Pick<Session, 'hat' | 'rounds'>): HatProgress {
  const hat = session.hat ?? [];
  const total = hat.length;

  let phase: Phase = 1;
  for (const round of session.rounds) {
    if (round.endedAt !== null && round.phase && round.phase > phase) phase = round.phase;
  }

  for (;;) {
    const guessed = guessedIn(session.rounds, phase);
    const remaining = hat.filter((key) => !guessed.has(key));
    if (remaining.length > 0 || total === 0) {
      return { done: false, phase, remaining, guessed: total - remaining.length, total };
    }
    if (phase === 3) return { done: true, total };
    phase = (phase + 1) as Phase;
  }
}

/** Fills the hat from every playable card, at random. */
export function fillHat(keys: readonly string[], size: number, random: Random): string[] {
  return shuffle(keys, random).slice(0, Math.max(0, size));
}
