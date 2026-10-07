/**
 * Deck interchange format.
 *
 * This is the shape that crosses trust boundaries: bundled JSON, exported
 * files, QR payloads and pasted text. Storage normalises it into tables; see
 * spec/decisions.md for why the two differ.
 */

/** Bumped only for a breaking change to the deck shape. */
export const CURRENT_DECK_SCHEMA_VERSION = 1;

export type Card = {
  id: string;
  text: string;
  /**
   * Clue-giver hint, shown in the recap. The one exception is an emoji card,
   * where the note is the answer and sits under the emoji for the room.
   */
  note: string | null;
  /**
   * Words the clue-giver may not say in Taboo mode. Absent rather than empty
   * when a card has none, so a deck without them reads exactly as it always
   * did.
   */
  taboo?: string[];
  /**
   * A photo, as a JPEG data URI, shown above the text. Lives inside the deck
   * so a file or AirDrop carries it; QR codes and links leave it out, since a
   * photo is far bigger than a code can hold.
   */
  image?: string;
};

export type Deck = {
  schemaVersion: number;
  id: string;
  name: string;
  description: string;
  author: string;
  /** BCP 47 tag. Only 'en' ships in v1, but decks carry it for later. */
  language: string;
  /** Hex colour driving the full-bleed card background. */
  accentColor: string;
  /**
   * The deck's cover sticker, shown on its tile, its lens and its page.
   * Optional and left off when unset, like a card's photo, so older decks and
   * older builds are unaffected.
   */
  emoji?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  cards: Card[];
};

/** Where a deck came from. Bundled decks are re-seeded on app update. */
export type DeckSource = 'bundled' | 'custom';

/** A deck as stored, with the fields storage owns rather than the format. */
export type StoredDeck = Deck & {
  source: DeckSource;
};

/** Deck browser row. Avoids loading every card to show a count. */
export type DeckSummary = {
  id: string;
  name: string;
  description: string;
  author: string;
  accentColor: string;
  emoji: string | null;
  tags: string[];
  source: DeckSource;
  cardCount: number;
  /** The first card's text, as a peek at what is inside. */
  sample: string | null;
  updatedAt: string;
};

/** Shown for a deck that has not picked an emoji. */
export const DEFAULT_DECK_EMOJI = '🃏';

/** The cover emoji offered in the editor. Any emoji imports fine; these are quick picks. */
export const DECK_EMOJI_CHOICES = [
  '🃏', '🎉', '🔥', '😂', '💅', '🎓', '🍕', '🍿', '🎬', '🎤', '🎮', '🏀', '⚽', '🐶', '🦄', '👻',
  '🤡', '👽', '🌮', '🧋', '🏠', '✈️', '🏖️', '🎄', '🎃', '❤️', '💀', '🧠', '🚀', '🌈', '👯', '✨',
] as const;

/** Longest emoji string a deck may carry: room for a joined emoji or two. */
export const MAX_DECK_EMOJI_LENGTH = 16;

/** Taboo mode lists up to this many forbidden words per card. */
export const MAX_TABOO_WORDS = 5;
export const MAX_TABOO_WORD_LENGTH = 32;

/**
 * Upper bound on a card photo's data URI. Photos are resized to 640px JPEG
 * before they are stored, which lands well under this; the cap is for
 * imported files, so one huge image cannot stall the app.
 */
export const MAX_IMAGE_DATA_LENGTH = 600_000;

/** Text longer than this still saves, but wrecks legibility at arm's length. */
export const CARD_TEXT_SOFT_CAP = 60;

/** A deck may exist with fewer, it just cannot start a round. */
export const MIN_PLAYABLE_CARDS = 10;

export function isPlayable(deck: Pick<Deck, 'cards'>): boolean {
  return deck.cards.length >= MIN_PLAYABLE_CARDS;
}

export function summaryIsPlayable(summary: Pick<DeckSummary, 'cardCount'>): boolean {
  return summary.cardCount >= MIN_PLAYABLE_CARDS;
}

/** True when the card's text is nothing but emoji, so its note is the answer. */
export function isEmojiCard(card: Pick<Card, 'text'>): boolean {
  const text = card.text.replace(/\s+/g, '');
  return text.length > 0 && /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\u200D|\uFE0F|\p{Regional_Indicator})+$/u.test(text);
}

/** True when any card carries Taboo words. */
export function hasTabooWords(deck: Pick<Deck, 'cards'>): boolean {
  return deck.cards.some((card) => (card.taboo?.length ?? 0) > 0);
}
