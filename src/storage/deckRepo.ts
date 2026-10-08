import type { Card, Deck, DeckSource, DeckSummary, StoredDeck } from '@/decks/types';
import type { Sql, SqlValue } from './sql';

/**
 * Reading and writing decks.
 *
 * Storage is normalised into decks and cards rather than a JSON blob per deck,
 * because the browser needs card counts for every deck in one query, search
 * needs to match card text, and M4 needs per-card reordering. See
 * spec/decisions.md.
 */

type DeckRow = {
  id: string;
  schemaVersion: number;
  name: string;
  description: string;
  author: string;
  language: string;
  accentColor: string;
  emoji: string | null;
  tags: string;
  source: DeckSource;
  createdAt: string;
  updatedAt: string;
};

type SummaryRow = Omit<DeckRow, 'schemaVersion' | 'language'> & {
  cardCount: number;
  sample: string | null;
  favorite: number;
  mineCount: number;
  hiddenCount: number;
};

type CardRow = {
  id: string;
  text: string;
  note: string | null;
  taboo: string | null;
  image: string | null;
  mine: number;
  hidden: number;
};

/** Where cards you add to a free deck start, so they always sit after its own. */
const MINE_POSITION = 100_000;

/**
 * Tags and Taboo words are stored as a JSON array in a text column. They are only ever read and
 * written whole, never queried across, so a join table would buy nothing. A
 * corrupt value degrades to no tags rather than failing the read — losing a
 * label is recoverable, losing the deck is not.
 */
function parseStringList(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

/** A card row back into a card, leaving out the optional fields it lacks. */
function toCard(row: CardRow): Card {
  const card: Card = { id: row.id, text: row.text, note: row.note };
  const taboo = row.taboo ? parseStringList(row.taboo) : [];
  if (taboo.length > 0) card.taboo = taboo;
  if (row.image) card.image = row.image;
  if (row.mine) card.mine = true;
  if (row.hidden) card.hidden = true;
  return card;
}

function toSummary(row: SummaryRow): DeckSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    author: row.author,
    accentColor: row.accentColor,
    emoji: row.emoji ?? null,
    tags: parseStringList(row.tags),
    source: row.source,
    cardCount: row.cardCount,
    sample: row.sample ?? null,
    updatedAt: row.updatedAt,
    favorite: row.favorite === 1,
    mineCount: row.mineCount,
    hiddenCount: row.hiddenCount,
  };
}

const SUMMARY_SELECT = `
  SELECT d.id, d.name, d.description, d.author, d.accentColor, d.emoji, d.tags, d.source,
         d.createdAt, d.updatedAt, d.favorite,
         (SELECT COUNT(*) FROM cards c WHERE c.deckId = d.id AND c.hidden = 0) AS cardCount,
         (SELECT COUNT(*) FROM cards c WHERE c.deckId = d.id AND c.mine = 1) AS mineCount,
         (SELECT COUNT(*) FROM cards c WHERE c.deckId = d.id AND c.hidden = 1) AS hiddenCount,
         (SELECT c.text FROM cards c WHERE c.deckId = d.id AND c.hidden = 0 ORDER BY c.position LIMIT 1) AS sample
  FROM decks d
`;

/** Bundled decks first, then custom, each alphabetical. */
const SUMMARY_ORDER = `ORDER BY CASE d.source WHEN 'bundled' THEN 0 ELSE 1 END, d.name COLLATE NOCASE`;

export async function listDeckSummaries(db: Sql): Promise<DeckSummary[]> {
  const rows = await db.getAllAsync<SummaryRow>(`${SUMMARY_SELECT} ${SUMMARY_ORDER}`, []);
  return rows.map(toSummary);
}

/**
 * Searches deck names, descriptions, tags and card text.
 *
 * Card text is included because people remember a deck by something in it more
 * often than by what it is called.
 */
export async function searchDeckSummaries(db: Sql, query: string): Promise<DeckSummary[]> {
  const trimmed = query.trim();
  if (!trimmed) return listDeckSummaries(db);

  // LIKE with an escaped pattern rather than FTS: the deck count on a phone is
  // small, and this avoids a second table to keep in sync on every edit.
  const pattern = `%${trimmed.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

  const rows = await db.getAllAsync<SummaryRow>(
    `${SUMMARY_SELECT}
     WHERE d.name LIKE ?1 ESCAPE '\\'
        OR d.description LIKE ?1 ESCAPE '\\'
        OR d.tags LIKE ?1 ESCAPE '\\'
        OR EXISTS (SELECT 1 FROM cards c WHERE c.deckId = d.id AND c.hidden = 0 AND c.text LIKE ?1 ESCAPE '\\')
     ${SUMMARY_ORDER}`,
    [pattern],
  );

  return rows.map(toSummary);
}

/**
 * A deck as it plays: hidden cards left out. Pass `withHidden` for the free
 * deck editor, which needs them to offer them back.
 */
export async function getDeck(
  db: Sql,
  deckId: string,
  { withHidden = false }: { withHidden?: boolean } = {},
): Promise<StoredDeck | null> {
  const row = await db.getFirstAsync<DeckRow>('SELECT * FROM decks WHERE id = ?', [deckId]);
  if (!row) return null;

  const cards = await db.getAllAsync<CardRow>(
    `SELECT id, text, note, taboo, image, mine, hidden FROM cards
     WHERE deckId = ? ${withHidden ? '' : 'AND hidden = 0'} ORDER BY position`,
    [deckId],
  );

  const deck: StoredDeck = {
    schemaVersion: row.schemaVersion,
    id: row.id,
    name: row.name,
    description: row.description,
    author: row.author,
    language: row.language,
    accentColor: row.accentColor,
    tags: parseStringList(row.tags),
    source: row.source,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    cards: cards.map(toCard),
  };
  if (row.emoji) deck.emoji = row.emoji;
  return deck;
}

export async function getDeckSummary(db: Sql, deckId: string): Promise<DeckSummary | null> {
  const row = await db.getFirstAsync<SummaryRow>(`${SUMMARY_SELECT} WHERE d.id = ?`, [deckId]);
  return row ? toSummary(row) : null;
}

export async function countDecks(db: Sql, source?: DeckSource): Promise<number> {
  const row = source
    ? await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM decks WHERE source = ?', [
        source,
      ])
    : await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM decks', []);
  return row?.n ?? 0;
}

/**
 * Writes a deck and its cards, replacing any existing deck with the same id.
 *
 * Cards are deleted and reinserted rather than diffed. Card ids are supplied by
 * the caller and preserved exactly, so a rewrite does not disturb seen-card
 * tracking; position comes from array order, which is what the M4 editor
 * reorders.
 *
 * Your changes to a free deck survive this. Cards you added are left in
 * place, and cards you hid are hidden again after the rewrite, matched by id
 * (ids come from the card text, so a card that is still there keeps its id).
 */
export async function upsertDeck(db: Sql, deck: Deck, source: DeckSource): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO decks (id, schemaVersion, name, description, author, language, accentColor, emoji, tags, source, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         schemaVersion = excluded.schemaVersion,
         name          = excluded.name,
         description   = excluded.description,
         author        = excluded.author,
         language      = excluded.language,
         accentColor   = excluded.accentColor,
         emoji         = excluded.emoji,
         tags          = excluded.tags,
         source        = excluded.source,
         updatedAt     = excluded.updatedAt`,
      [
        deck.id,
        deck.schemaVersion,
        deck.name,
        deck.description,
        deck.author,
        deck.language,
        deck.accentColor,
        deck.emoji ?? null,
        JSON.stringify(deck.tags),
        source,
        deck.createdAt,
        deck.updatedAt,
      ],
    );

    const hidden = await db.getAllAsync<{ id: string }>('SELECT id FROM cards WHERE deckId = ? AND hidden = 1', [deck.id]);
    await db.runAsync('DELETE FROM cards WHERE deckId = ? AND mine = 0', [deck.id]);

    for (const [position, card] of deck.cards.filter((c) => !c.mine).entries()) {
      await db.runAsync(
        'INSERT INTO cards (id, deckId, text, note, taboo, image, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          card.id,
          deck.id,
          card.text,
          card.note,
          card.taboo && card.taboo.length > 0 ? JSON.stringify(card.taboo) : null,
          card.image ?? null,
          position,
        ] satisfies SqlValue[],
      );
    }

    for (const { id } of hidden) {
      await db.runAsync('UPDATE cards SET hidden = 1 WHERE deckId = ? AND id = ?', [deck.id, id]);
    }
  });
}

/**
 * Saves your changes to a free deck: which of its cards are hidden, and the
 * cards you added. The deck's own cards are not rewritten, so an app update
 * can keep improving them underneath your changes.
 */
export async function saveDeckChanges(
  db: Sql,
  deckId: string,
  changes: { hidden: readonly string[]; mine: readonly Card[] },
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE cards SET hidden = 0 WHERE deckId = ? AND mine = 0', [deckId]);
    for (const id of changes.hidden) {
      await db.runAsync('UPDATE cards SET hidden = 1 WHERE deckId = ? AND id = ? AND mine = 0', [deckId, id]);
    }

    await db.runAsync('DELETE FROM cards WHERE deckId = ? AND mine = 1', [deckId]);
    for (const [index, card] of changes.mine.entries()) {
      await db.runAsync(
        'INSERT INTO cards (id, deckId, text, note, taboo, image, position, mine) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
        [
          card.id,
          deckId,
          card.text,
          card.note,
          card.taboo && card.taboo.length > 0 ? JSON.stringify(card.taboo) : null,
          card.image ?? null,
          MINE_POSITION + index,
        ] satisfies SqlValue[],
      );
    }
  });
}

/** Stars or unstars a deck. Starred decks come first everywhere. */
export async function setFavorite(db: Sql, deckId: string, favorite: boolean): Promise<void> {
  await db.runAsync('UPDATE decks SET favorite = ? WHERE id = ?', [favorite ? 1 : 0, deckId]);
}

/** Returns false when the deck was not there. Cards go with it via cascade. */
export async function deleteDeck(db: Sql, deckId: string): Promise<boolean> {
  const result = await db.runAsync('DELETE FROM decks WHERE id = ?', [deckId]);
  return result.changes > 0;
}

export async function deckExists(db: Sql, deckId: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM decks WHERE id = ?', [
    deckId,
  ]);
  return (row?.n ?? 0) > 0;
}
