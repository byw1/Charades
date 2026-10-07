import type { GameMode } from './types';

/**
 * The voice referee's ears.
 *
 * A phone cannot tell who is talking, so what the referee listens for depends
 * on the mode. In every mode, hearing the answer means someone said it, and
 * the person most likely to have said it is the guesser: got it. In Taboo it
 * also listens for the forbidden words, which only the clue-givers have a
 * reason to say: busted. A forbidden word heard first wins, so a clue-giver
 * blurting "shark, the shark film" is busted before "Jaws" can count.
 *
 * Matching is by whole words, ignoring case, accents and punctuation, with a
 * plural or a dropped leading "the" allowed, because recognisers write "the
 * lion king" as often as "Lion King".
 */

export type Verdict = { kind: 'correct' } | { kind: 'busted'; word: string };

const ARTICLES = new Set(['the', 'a', 'an']);

export function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function same(heard: string, wanted: string): boolean {
  if (heard === wanted) return true;
  // One trailing s either way: "penguins" for "penguin", "oreo" for "oreos".
  return (heard.length > 3 && heard === `${wanted}s`) || (wanted.length > 3 && wanted === `${heard}s`);
}

/** Whether the phrase's words appear, in order and together, in what was heard. */
export function heard(transcript: readonly string[], phrase: string): boolean {
  let target = words(phrase);
  while (target.length > 1 && ARTICLES.has(target[0]!)) target = target.slice(1);
  if (target.length === 0) return false;

  outer: for (let i = 0; i + target.length <= transcript.length; i += 1) {
    for (let j = 0; j < target.length; j += 1) {
      if (!same(transcript[i + j]!, target[j]!)) continue outer;
    }
    return true;
  }
  return false;
}

/**
 * Judges what has been heard so far for the card on screen.
 *
 * `alternatives` are the recogniser's guesses at the same speech, best first.
 * The answer counts if any guess has it — a missed "got it" is the annoying
 * failure. A busted word needs the best guess, since a false "busted" costs a
 * point.
 */
export function judge(
  alternatives: readonly string[],
  card: { text: string; note: string | null; taboo?: readonly string[] },
  mode: GameMode,
  emojiAnswer = false,
): Verdict | null {
  const best = words(alternatives[0] ?? '');

  if (mode === 'taboo') {
    for (const word of card.taboo ?? []) {
      if (heard(best, word)) return { kind: 'busted', word };
    }
  }

  // An emoji card's answer is its note; the emoji themselves cannot be said.
  const answer = emojiAnswer && card.note ? card.note : card.text;
  for (const alternative of alternatives) {
    if (heard(words(alternative), answer)) return { kind: 'correct' };
  }
  return null;
}

/** Words worth biasing the recogniser towards for this card. */
export function hints(card: { text: string; note: string | null; taboo?: readonly string[] }, emojiAnswer = false): string[] {
  const answer = emojiAnswer && card.note ? card.note : card.text;
  return [answer, ...(card.taboo ?? [])];
}
