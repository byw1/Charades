import { CARD_TEXT_SOFT_CAP } from './types';

/**
 * Turning a language model's answer into cards.
 *
 * The model is asked for one card per line and nothing else, and it mostly
 * obliges — but a small on-device model also numbers lines, adds bullets,
 * wraps things in quotes, and opens with "Here are 30 cards:". All of that is
 * stripped here rather than trusted away in the prompt.
 */

/** Chatty openers. A heading like "Cards:" is caught by its trailing colon. */
const PREAMBLE = /^(here (are|is)\b|sure[,!.]|okay[,!.]|ok[,!.]|certainly[,!.]|of course[,!.])/i;

export function parseGeneratedCards(text: string, limit = 40): string[] {
  const seen = new Set<string>();
  const cards: string[] = [];

  for (const raw of text.split(/\r?\n|;/)) {
    let line = raw.trim();
    if (!line) continue;
    if (line.endsWith(':') || PREAMBLE.test(line)) continue;

    line = line
      .replace(/^\s*(?:\d+[.)\]:-]|[-*•·–—]|#+)\s*/, '')
      .replace(/^["“”'‘’]+|["“”'‘’]+$/g, '')
      .replace(/\*\*/g, '')
      .replace(/[.!,]+$/, '')
      .trim();

    // "Pizza – a round flatbread": keep the card, drop the explanation.
    line = line.split(/\s+[–—-]\s+|:\s+/)[0]!.trim();

    if (!line || line.length > CARD_TEXT_SOFT_CAP) continue;
    const key = line.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push(line);
    if (cards.length >= limit) break;
  }

  return cards;
}

/** The instructions the on-device model is given. */
export const DECK_INSTRUCTIONS =
  'You write cards for a party guessing game, where friends describe a card to one player who has to guess it. ' +
  'Every card is a short, well-known name or phrase of one to four words that a group of college students would recognise. ' +
  'Keep it fun and suitable for everyone: nothing sexual, no drugs or alcohol, no slurs, nothing hateful. ' +
  'Reply with the cards only, one per line, with no numbering, no bullets and no explanations.';

export function deckPrompt(theme: string, count: number): string {
  return `Theme: ${theme.trim()}\nWrite ${count} different cards for this theme.`;
}
