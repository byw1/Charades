import { makeCardId, makeDeckId, type RandomSource } from './ids';
import { CARD_TEXT_SOFT_CAP, CURRENT_DECK_SCHEMA_VERSION, type Card, type Deck } from './types';

/**
 * "A deck about your group."
 *
 * A few questions about the friend group, and every answer becomes a card.
 * The best decks are the ones only the people in the room could play, and
 * nobody sits down to write one from a blank page; answering "where do you
 * all end up?" is easy.
 */

export type GroupPrompt = {
  id: string;
  emoji: string;
  title: string;
  hint: string;
  /** Shown faintly in the empty box, one example per line. */
  example: string;
};

export const GROUP_PROMPTS: readonly GroupPrompt[] = [
  {
    id: 'people',
    emoji: '👯',
    title: 'Who’s in the group?',
    hint: 'Friends, roommates, the one who always shows up late. One per line.',
    example: 'Sam\nAlex\nJo’s mum',
  },
  {
    id: 'places',
    emoji: '📍',
    title: 'Where do you all end up?',
    hint: 'The diner, someone’s couch, that one parking lot.',
    example: 'Taco Tuesday spot\nThe library basement\nAlex’s car',
  },
  {
    id: 'jokes',
    emoji: '😂',
    title: 'Inside jokes',
    hint: 'The stuff nobody outside the group would get.',
    example: 'The great pizza incident\nCanoe trip\nThe group chat name',
  },
  {
    id: 'sayings',
    emoji: '💬',
    title: 'Things someone always says',
    hint: 'Catchphrases. Add who says it after a | if you like.',
    example: 'Five more minutes | Jo\nIt’s giving | Sam',
  },
  {
    id: 'obsessions',
    emoji: '📺',
    title: 'What you’re all obsessed with',
    hint: 'Shows, songs, games, snacks, that one TikTok.',
    example: 'Love Island\nMario Kart\nSpicy ramen',
  },
];

export type GroupPhoto = { image: string; name: string };

export type GroupAnswers = {
  answers: Readonly<Record<string, string>>;
  photos?: readonly GroupPhoto[];
  name?: string;
  accentColor: string;
  now: string;
  random?: RandomSource;
};

export const DEFAULT_GROUP_DECK_NAME = 'The Group Chat';

/** Every line of every answer, de-duplicated, as cards. Photos come first. */
export function groupCards(input: Pick<GroupAnswers, 'answers' | 'photos' | 'random'>): Card[] {
  const seen = new Set<string>();
  const cards: Card[] = [];

  const add = (text: string, note: string | null, image?: string) => {
    const clean = text.trim().slice(0, CARD_TEXT_SOFT_CAP);
    const key = clean.toLocaleLowerCase();
    if (!clean || seen.has(key)) return;
    seen.add(key);
    const card: Card = { id: makeCardId(input.random), text: clean, note };
    if (image) card.image = image;
    cards.push(card);
  };

  for (const photo of input.photos ?? []) add(photo.name, null, photo.image);

  for (const prompt of GROUP_PROMPTS) {
    const answer = input.answers[prompt.id] ?? '';
    for (const line of answer.split(/\r?\n/)) {
      const pipe = line.indexOf('|');
      const text = pipe === -1 ? line : line.slice(0, pipe);
      const note = pipe === -1 ? null : line.slice(pipe + 1).trim() || null;
      // A catchphrase card shows the phrase; who says it is the clue-giver's hint.
      add(text, prompt.id === 'sayings' && note ? `Says it: ${note}` : note);
    }
  }

  return cards;
}

export function buildGroupDeck(input: GroupAnswers): Deck {
  return {
    schemaVersion: CURRENT_DECK_SCHEMA_VERSION,
    id: makeDeckId(input.random),
    name: input.name?.trim() || DEFAULT_GROUP_DECK_NAME,
    description: 'Made by the group, about the group. Only the people in the room can play this one.',
    author: '',
    language: 'en',
    accentColor: input.accentColor,
    tags: ['group', 'custom'],
    createdAt: input.now,
    updatedAt: input.now,
    cards: groupCards(input),
  };
}
