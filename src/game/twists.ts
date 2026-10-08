import type { Random } from './random';
import type { SessionSettings } from './types';

/**
 * Chaos twists: a random rule on some rounds.
 *
 * Most are pure performance — the app announces them and the room enforces
 * them, the way a group enforces "no saying the word" already. Two change the
 * numbers, and those are the only ones the rest of the game knows about:
 * double points multiplies the round's correct cards, and the speed round
 * halves the clock.
 *
 * Every twist is written for a phone on someone's forehead, so it constrains
 * the clue-givers, never the guesser.
 */

export type TwistEffect = 'double' | 'speed';

export type Twist = {
  id: string;
  emoji: string;
  title: string;
  rule: string;
  effect?: TwistEffect;
};

export const TWISTS: readonly Twist[] = [
  { id: 'accents', emoji: '🎭', title: 'Accents only', rule: 'Every clue in an accent. Pick one and commit.' },
  { id: 'whisper', emoji: '🤫', title: 'Whisper round', rule: 'Clue-givers can only whisper.' },
  { id: 'noHands', emoji: '🙌', title: 'No hands', rule: 'Hands behind your backs. Words only.' },
  { id: 'hum', emoji: '🎵', title: 'Hum it', rule: 'No words. Hum, beatbox or make noises.' },
  { id: 'slowMo', emoji: '🐌', title: 'Slow motion', rule: 'Every clue, every move, in slow motion.' },
  { id: 'robot', emoji: '🤖', title: 'Robot voice', rule: 'Clue-givers talk like robots. Beep boop.' },
  { id: 'sing', emoji: '🎤', title: 'Sing it', rule: 'Every clue has to be sung.' },
  { id: 'caveman', emoji: '🦴', title: 'Caveman', rule: 'Grunts and pointing. No real words.' },
  { id: 'freeze', emoji: '🧊', title: 'Freeze', rule: 'Clue-givers can’t move. Voices only.' },
  { id: 'opposite', emoji: '🔄', title: 'Opposite day', rule: 'Describe it only by saying what it isn’t.' },
  { id: 'oneVoice', emoji: '☝️', title: 'One voice', rule: 'Only one clue-giver at a time. Take turns.' },
  { id: 'double', emoji: '💎', title: 'Double points', rule: 'Every card you get is worth two.', effect: 'double' },
  { id: 'speed', emoji: '⚡', title: 'Speed round', rule: 'Half the time. Go, go, go.', effect: 'speed' },
];

/** How often a round gets a twist when chaos is on. Often, not always. */
export const TWIST_CHANCE = 0.6;

export function twistById(id: string | null | undefined): Twist | undefined {
  return id ? TWISTS.find((twist) => twist.id === id) : undefined;
}

/**
 * Picks the twist for the next round, or none.
 *
 * Never the same twist twice in a row: the second "whisper round" in a row is
 * a repeat, not chaos.
 */
export function pickTwist(previous: string | null | undefined, random: Random): string | null {
  if (random() >= TWIST_CHANCE) return null;
  const options = TWISTS.filter((twist) => twist.id !== previous);
  return options[Math.floor(random() * options.length)]?.id ?? null;
}

/** Points a correct card is worth in a round with this twist. */
export function correctValue(twistId: string | null | undefined): number {
  return twistById(twistId)?.effect === 'double' ? 2 : 1;
}

/** The speed round halves the clock, but never below the shortest round. */
export const SPEED_ROUND_MIN_SECONDS = 15;

export function roundSeconds(settings: Pick<SessionSettings, 'roundSeconds'>, twistId: string | null | undefined): number {
  if (twistById(twistId)?.effect !== 'speed') return settings.roundSeconds;
  return Math.max(SPEED_ROUND_MIN_SECONDS, Math.round(settings.roundSeconds / 2));
}
