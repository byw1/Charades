import * as Brightness from 'expo-brightness';
import { useKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import { lockFor } from './orientationLock';

export type RoundScreenModeOptions = {
  /**
   * Hold the screen the way it is facing now, portrait or landscape, until
   * this screen goes. Only the running round needs it: everywhere else the app
   * turns with the phone.
   */
  holdOrientation?: boolean;
  /** Push brightness toward max. Only the round itself needs this. */
  boostBrightness?: boolean;
};

/**
 * Puts the device into round mode and puts it back afterwards.
 *
 * Orientation held, screen kept awake, brightness pushed toward max so the card
 * reads across a dim room. Everything is reversed on unmount: leaving a phone
 * at full brightness and unable to sleep after a party game is a battery
 * complaint waiting to happen.
 *
 * Brightness is restored to the value read on entry rather than to the system
 * setting, because restoreSystemBrightnessAsync is Android-only and this is an
 * iOS-first app.
 */
export function useRoundScreenMode({
  holdOrientation = false,
  boostBrightness = false,
}: RoundScreenModeOptions = {}): void {
  useKeepAwake();

  useEffect(() => {
    if (!holdOrientation) return;

    let cancelled = false;
    let locked = false;

    void (async () => {
      try {
        const lock = lockFor(await ScreenOrientation.getOrientationAsync());
        if (cancelled || lock === null) return;
        await ScreenOrientation.lockAsync(lock);
        locked = true;
        if (cancelled) await ScreenOrientation.unlockAsync();
      } catch {
        // A phone that refuses the lock still plays fine; it just turns with
        // the hand. Not worth failing a round over.
      }
    })();

    return () => {
      cancelled = true;
      if (locked) void ScreenOrientation.unlockAsync().catch(() => undefined);
    };
  }, [holdOrientation]);

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
