/**
 * The order decks appear in on the Play carousel and the Decks grid.
 *
 * Favourites always come first, then the chosen sort. Ties fall back to the
 * name, so the order never shuffles between visits.
 */

export type DeckSort = 'played' | 'az' | 'newest';

export const DECK_SORTS: readonly { key: DeckSort; label: string }[] = [
  { key: 'played', label: 'Most played' },
  { key: 'az', label: 'A–Z' },
  { key: 'newest', label: 'Newest' },
];

export type Orderable = { id: string; name: string; favorite: boolean; updatedAt: string };

export function orderDecks<T extends Orderable>(decks: readonly T[], sort: DeckSort, plays: ReadonlyMap<string, number>): T[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

  return [...decks].sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    if (sort === 'played') {
      const diff = (plays.get(b.id) ?? 0) - (plays.get(a.id) ?? 0);
      if (diff !== 0) return diff;
    }
    if (sort === 'newest' && a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1;
    return byName(a, b);
  });
}

/** How many games each deck has been in, from the saved games. */
export function playCounts(sessions: readonly { deckIds: readonly string[] }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    for (const id of new Set(session.deckIds)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}
