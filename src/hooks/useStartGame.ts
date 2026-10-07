import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { makeSessionId } from '@/game/ids';
import type { SessionSettings, Team } from '@/game/types';
import { getDeck } from '@/storage/deckRepo';
import { discardOtherUnfinishedSessions, saveSession } from '@/storage/sessionRepo';
import { useDatabase } from './useDatabase';
import { useSessionStore } from './useSessionStore';
import { useSettings } from './useSettings';

export type StartGameInput = {
  deckIds: string[];
  teams: Team[];
  settings: SessionSettings;
};

/**
 * Starts a game and takes the phone into the round.
 *
 * One path for both ways in — the one-tap shutter on the Play screen and the
 * full setup flow — so a quick game and a configured one are saved, resumed
 * and scored identically.
 */
export function useStartGame(): { start: (input: StartGameInput) => Promise<boolean>; starting: boolean } {
  const router = useRouter();
  const database = useDatabase();
  const startSession = useSessionStore((s) => s.startSession);
  const appSettings = useSettings();
  const [starting, setStarting] = useState(false);

  const start = useCallback(
    async ({ deckIds, teams, settings }: StartGameInput): Promise<boolean> => {
      if (database.status !== 'ready' || starting) return false;
      setStarting(true);

      try {
        const loaded = await Promise.all(deckIds.map((id) => getDeck(database.db, id)));
        const decks = loaded.flatMap((deck) =>
          deck ? [{ id: deck.id, name: deck.name, accentColor: deck.accentColor, cards: deck.cards }] : [],
        );
        if (decks.length === 0) return false;

        const session = startSession({
          id: makeSessionId(),
          decks,
          teams,
          // Input mode is a preference about the person holding the phone, not
          // about this game, so it is set once in app settings. Stamped in here
          // so the stored session records what it was actually played with.
          settings: { ...settings, inputMode: appSettings.inputMode },
          now: new Date().toISOString(),
          seed: Date.now() >>> 0,
        });

        // Written before the first round so a crash during play still leaves
        // something to resume, and any earlier half-played game is abandoned
        // now rather than lingering to be offered later.
        await saveSession(database.db, session);
        await discardOtherUnfinishedSessions(database.db, session.id);

        if (router.canDismiss()) router.dismissAll();
        router.push('/round/intro');
        return true;
      } finally {
        setStarting(false);
      }
    },
    [appSettings.inputMode, database, router, startSession, starting],
  );

  return { start, starting };
}
