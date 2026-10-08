import { useEffect, useRef } from 'react';
import type { PoolCard } from '@/game/cardDrawer';
import type { GameMode } from '@/game/types';
import { hints, judge } from '@/game/voice';
import { isEmojiCard } from '@/decks/types';
import { listen, voicePermitted } from '@/media/voice';

/**
 * Listens to the room during a round and calls it: got it when the answer is
 * heard, busted when a Taboo word is. One verdict per card, then it waits for
 * the next one, so a cheer after a correct guess cannot score the next card.
 *
 * Recognition restarts for every card, which gives each one a clean slate and
 * lets the recogniser lean towards that card's words.
 */
export function useVoiceReferee(options: {
  enabled: boolean;
  card: PoolCard | null;
  mode: GameMode;
  onCorrect: () => void;
  onBusted: (word: string) => void;
}): void {
  const { enabled, card, mode } = options;
  const callbacks = useRef(options);
  useEffect(() => {
    callbacks.current = options;
  });

  const key = card ? `${card.deckId}/${card.cardId}` : null;

  useEffect(() => {
    if (!enabled || !card) return;
    let decided = false;
    let stop: (() => void) | null = null;
    let cancelled = false;
    const emoji = isEmojiCard(card);

    void voicePermitted().then((ok) => {
      if (!ok || cancelled) return;
      stop = listen(hints(card, emoji), (alternatives) => {
        if (decided) return;
        const verdict = judge(alternatives, card, mode, emoji);
        if (!verdict) return;
        decided = true;
        if (verdict.kind === 'correct') callbacks.current.onCorrect();
        else callbacks.current.onBusted(verdict.word);
      });
    });

    return () => {
      cancelled = true;
      stop?.();
    };
    // Keyed on the card itself, not the object, so a re-render does not restart listening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, mode]);
}
