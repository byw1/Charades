import * as Brightness from 'expo-brightness';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';

export type RoundScreenModeOptions = {
  /** Push brightness toward max. Only the round itself needs this. */
  boostBrightness?: boolean;
};

/**
 * Puts the device into round mode and puts it back afterwards.
 *
 * Screen kept awake, brightness pushed toward max so the card
 * reads across a dim room. Everything is reversed on unmount: leaving a phone
 * at full brightness and unable to sleep after a party game is a battery
 * complaint waiting to happen.
 *
 * Brightness is restored to the value read on entry rather than to the system
 * setting, because restoreSystemBrightnessAsync is Android-only and this is an
 * iOS-first app.
 */
export function useRoundScreenMode({
  boostBrightness = false,
}: RoundScreenModeOptions = {}): void {
  useKeepAwake();

  useEffect(() => {
    if (!boostBrightness) return;

    let cancelled = false;
    let previous: number | null = null;

    void (async () => {
      try {
        const current = await Brightness.getBrightnessAsync();
        if (cancelled) return;
        previous = current;
        await Brightness.setBrightnessAsync(1);
      } catch {
        // Brightness needs a permission on some platforms. Without it the round
        // still works, it is just dimmer.
      }
    })();

    return () => {
      cancelled = true;
      if (previous !== null) {
        void Brightness.setBrightnessAsync(previous).catch(() => undefined);
      }
    };
  }, [boostBrightness]);
}
