import type { Round } from './types';

/**
 * The moments in a round's video.
 *
 * A clip starts recording a little after the round does (the camera needs a
 * moment), so each result's time in the round is shifted by when the clip
 * began. A result from before the clip started has no moment to show.
 */
export type Moment = {
  cardId: string;
  outcome: 'correct' | 'pass';
  busted?: string;
  /** Milliseconds into the clip. */
  atMs: number;
};

export function momentsIn(round: Pick<Round, 'results'>, clipStartRoundMs: number): Moment[] {
  return round.results
    .filter((result) => result.atMs >= clipStartRoundMs)
    .map((result) => {
      const moment: Moment = { cardId: result.cardId, outcome: result.outcome, atMs: result.atMs - clipStartRoundMs };
      if (result.busted) moment.busted = result.busted;
      return moment;
    });
}

/** How long a moment's sticker stays on screen, from when it happened. */
export const MOMENT_MS = 1_800;

/** The moment to show at a point in the clip, if one just happened. */
export function momentAt(moments: readonly Moment[], clipMs: number): Moment | null {
  let shown: Moment | null = null;
  for (const moment of moments) {
    if (moment.atMs <= clipMs && clipMs - moment.atMs < MOMENT_MS) shown = moment;
  }
  return shown;
}
