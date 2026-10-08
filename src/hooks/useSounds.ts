import { useEffect, useMemo } from 'react';
import { playSound, preloadSounds, type SoundName } from '@/media/sounds';
import { useSettingsStore } from './useSettings';

/**
 * Sound effects, gated by the setting. Returns a player that does nothing
 * while sound is off, so callers never have to check.
 */
export function useSounds(): (name: SoundName) => void {
  const on = useSettingsStore((s) => s.sound);

  useEffect(() => {
    if (on) preloadSounds();
  }, [on]);

  return useMemo(() => (on ? playSound : () => undefined), [on]);
}
