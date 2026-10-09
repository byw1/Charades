import { routeForIncoming } from '@/decks/share';

/**
 * Rewrites URLs that open the app from outside.
 *
 * A deck link or a .charades (or older .deckhead) file — from AirDrop, Files, Mail or Messages —
 * goes to the import preview, so a deck from someone else is always shown and
 * confirmed before it is added. Everything else passes through untouched.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return routeForIncoming(path) ?? path;
  } catch {
    // A bad URL must never crash the launch; the home screen is a safe landing.
    return '/';
  }
}
