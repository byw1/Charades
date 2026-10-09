import type { SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { removeLeftovers } from '@/media/leftovers';
import { openDatabase } from '@/storage/database';
import { seedBundledDecks } from '@/storage/seed';

/**
 * Opens the database, migrates it and installs the bundled decks.
 *
 * One place owns startup so a screen never has to wonder whether the decks are
 * there yet.
 */

export type DatabaseState =
  | { status: 'loading' }
  | { status: 'ready'; db: SQLiteDatabase }
  | { status: 'error'; message: string };

let startup: Promise<SQLiteDatabase> | null = null;

/**
 * Open, migrate and seed, once per app launch, shared by every caller.
 *
 * Seeding has to be shared as well as the open. Every screen asks for the
 * database, and two asking in the same frame — Home and the start-game hook
 * do — would otherwise run two seeds at once on one connection: overlapping
 * transactions and duplicate inserts. A failed startup is not cached, so a
 * transient failure can be retried by the next screen that asks.
 */
function start(): Promise<SQLiteDatabase> {
  startup ??= (async () => {
    const db = await openDatabase();
    const report = await seedBundledDecks(db);
    removeLeftovers();

    if (report.rejected.length > 0) {
      // A build problem rather than a user problem, and the app still works
      // with whatever installed. Loud in development, silent in production
      // because there is nothing the user could do about it.
      if (__DEV__) {
        console.warn('Bundled decks failed validation:', report.rejected);
      }
    }

    return db;
  })().catch((error: unknown) => {
    startup = null;
    throw error;
  });

  return startup;
}

export function useDatabase(): DatabaseState {
  const [state, setState] = useState<DatabaseState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const db = await start();
        if (!cancelled) setState({ status: 'ready', db });
      } catch (error) {
        if (cancelled) return;
        setState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Charades could not open your decks. Restarting the app usually fixes it.',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
