import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { GameMode } from '@/game/types';

/**
 * App settings.
 *
 * Backed by expo-sqlite/kv-store rather than react-native-mmkv. MMKV v4 is a
 * Nitro module and cannot run in Expo Go, which would force a development build
 * for every review. kv-store fills the same role — synchronous reads, tiny
 * values — with no extra native dependency. See ROADMAP.md; this is the M3
 * decision the spec's stack list points at.
 *
 * Reads are synchronous so the first render already has the right values and
 * nothing flickers from a default to a stored setting.
 */

export type Settings = {
  haptics: boolean;
  /**
   * Off by default, deliberately. A ding for "correct" tells the guesser they
   * got it before anyone speaks, and it leaks across the room.
   */
  sound: boolean;
  /** Tap is the default. Tilt is opt-in. */
  inputMode: 'tap' | 'tilt';
  boostBrightness: boolean;
  /** Whether the first-launch how-to-play has been seen. */
  onboarded: boolean;
  /** The mode the one-tap shutter on the Play screen starts. */
  quickMode: GameMode;
  /** An evening nudge when a streak would otherwise end. Opt-in. */
  streakReminders: boolean;
  /**
   * Listens during a round, on the phone only, for a Taboo word (busted) or
   * the guesser saying the answer (got it). Opt-in: parties are loud, and a
   * microphone is not something to switch on for anyone by default.
   */
  voiceReferee: boolean;
  /** Films the room through the front camera during each round. Opt-in. */
  recordRounds: boolean;
};

export const defaultAppSettings: Settings = {
  haptics: true,
  sound: false,
  inputMode: 'tap',
  boostBrightness: true,
  onboarded: false,
  quickMode: 'classic',
  streakReminders: false,
  voiceReferee: false,
  recordRounds: false,
};

const SETTING_KEYS = Object.keys(defaultAppSettings) as (keyof Settings)[];

/** Keeps a stored value only when it has the type the default has. */
function sanitise(stored: Partial<Record<keyof Settings, unknown>>): Settings {
  const out: Record<string, unknown> = { ...defaultAppSettings };
  for (const key of SETTING_KEYS) {
    const value = stored[key];
    if (value !== undefined && typeof value === typeof defaultAppSettings[key]) out[key] = value;
  }
  const settings = out as Settings;
  if (!['classic', 'taboo', 'threeRounds'].includes(settings.quickMode)) settings.quickMode = 'classic';
  if (settings.inputMode !== 'tilt') settings.inputMode = 'tap';
  return settings;
}

const STORAGE_KEY = 'settings.v1';

function load(): Settings {
  try {
    const raw = Storage.getItemSync(STORAGE_KEY);
    if (!raw) return defaultAppSettings;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return defaultAppSettings;

    // Merged over defaults rather than trusted wholesale, so a settings blob
    // written by an older build gains new keys instead of leaving them
    // undefined.
    return sanitise(parsed as Partial<Record<keyof Settings, unknown>>);
  } catch {
    return defaultAppSettings;
  }
}

type SettingsStore = Settings & {
  set<K extends keyof Settings>(key: K, value: Settings[K]): void;
  resetAll(): void;
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...load(),

  set(key, value) {
    set({ [key]: value } as Pick<Settings, typeof key>);
    persist(get());
  },

  resetAll() {
    // Resetting preferences is not a reason to sit through the intro again.
    const next = { ...defaultAppSettings, onboarded: get().onboarded };
    set(next);
    persist(next);
  },
}));

function pick(settings: Settings): Settings {
  const out: Record<string, unknown> = {};
  for (const key of SETTING_KEYS) out[key] = settings[key];
  return out as Settings;
}

function persist(settings: Settings): void {
  void Storage.setItem(STORAGE_KEY, JSON.stringify(pick(settings))).catch(() => undefined);
}

/**
 * The settings values alone, without the setters.
 *
 * useShallow is load bearing: zustand v5 compares with Object.is, so a selector
 * building a fresh object every call would re-render forever without it.
 */
export function useSettings(): Settings {
  return useSettingsStore(useShallow(pick));
}
