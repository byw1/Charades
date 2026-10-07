/**
 * Session and round types, following the spec's data model.
 *
 * Score is always derived from rounds, never stored. A recap edit changes a
 * RoundResult and the standings recompute — there is no score field that could
 * drift out of sync.
 */

export type WinCondition =
  | { kind: 'rounds'; count: number }
  | { kind: 'score'; target: number }
  | { kind: 'deckExhausted' }
  /** Three-round mode: over when the last phase clears the hat. */
  | { kind: 'allPhases' };

/**
 * How the game is played.
 *
 * - classic: the room describes the card any way it likes.
 * - taboo: the card lists words the room may not say. Shown to players as
 *   "Banned" — Taboo is Hasbro's trademark, so it never appears in the app.
 * - threeRounds: one hat of cards played three times — say anything, then
 *   one word, then act it out — so every phase gets easier to remember and
 *   funnier to watch.
 */
export type GameMode = 'classic' | 'taboo' | 'threeRounds';

/** A phase of three-round mode. */
export type Phase = 1 | 2 | 3;

export type Team = {
  id: string;
  name: string;
  color: string;
  playerNames: string[];
  /** Rotates who holds the phone. */
  nextPlayerIndex: number;
};

export type Outcome = 'correct' | 'pass';

export type RoundResult = {
  cardId: string;
  outcome: Outcome;
  /** Milliseconds elapsed into the round. */
  atMs: number;
  /**
   * Taboo mode: the forbidden word someone said. A busted card scores as a
   * pass; this is only here so the recap can say what gave it away.
   */
  busted?: string;
};

export type Round = {
  id: string;
  teamId: string;
  playerName: string | null;
  startedAt: string;
  endedAt: string | null;
  results: RoundResult[];
  /** Chaos mode: the twist this round was played with. See twists.ts. */
  twist?: string;
  /** Three-round mode: which phase this round belonged to. */
  phase?: Phase;
};

export type SessionSettings = {
  /** 30 | 60 | 90, or custom 15-180. */
  roundSeconds: number;
  /** 0 or 1. Default 0. */
  passPenalty: number;
  inputMode: 'tap' | 'tilt';
  winCondition: WinCondition;
  shuffleAcrossDecks: boolean;
  mode: GameMode;
  /** A random twist on some rounds: accents only, double points, and so on. */
  chaos: boolean;
  /** A dare for whoever comes last. */
  forfeits: boolean;
  /** Three-round mode: how many cards go in the hat. */
  hatSize: number;
};

export type Session = {
  id: string;
  deckIds: string[];
  settings: SessionSettings;
  teams: Team[];
  rounds: Round[];
  /** Composite deckId/cardId keys. Grows across the whole session. */
  seenCardIds: string[];
  /**
   * Three-round mode: the cards in the hat, as composite keys. Fixed when the
   * game starts so all three phases replay the same cards.
   */
  hat?: string[];
  createdAt: string;
  completedAt: string | null;
};

export const ROUND_SECONDS_PRESETS = [30, 60, 90] as const;
export const MIN_ROUND_SECONDS = 15;
export const MAX_ROUND_SECONDS = 180;

/** When the "time is running out" haptic fires. */
export const WARNING_SECONDS = 10;

export const defaultSettings: SessionSettings = {
  roundSeconds: 60,
  passPenalty: 0,
  inputMode: 'tilt',
  winCondition: { kind: 'rounds', count: 4 },
  shuffleAcrossDecks: true,
  mode: 'classic',
  chaos: false,
  forfeits: false,
  hatSize: 30,
};

export const HAT_SIZES = [20, 30, 40] as const;
export const MIN_HAT_SIZE = 10;
export const MAX_HAT_SIZE = 60;

export function clampHatSize(size: number): number {
  if (!Number.isFinite(size)) return defaultSettings.hatSize;
  return Math.min(MAX_HAT_SIZE, Math.max(MIN_HAT_SIZE, Math.round(size)));
}

export function clampRoundSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) return defaultSettings.roundSeconds;
  return Math.min(MAX_ROUND_SECONDS, Math.max(MIN_ROUND_SECONDS, Math.round(seconds)));
}

/** The defaults, with a mode's own rules: the one-tap way into each mode. */
export function settingsForMode(mode: GameMode): SessionSettings {
  switch (mode) {
    case 'taboo':
      // Saying a forbidden word costs the card, as in the board game.
      return { ...defaultSettings, mode, passPenalty: 1 };
    case 'threeRounds':
      return { ...defaultSettings, mode, winCondition: { kind: 'allPhases' } };
    case 'classic':
      return defaultSettings;
  }
}
