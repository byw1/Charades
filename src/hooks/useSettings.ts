import { reloadAppAsync } from 'expo';
import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { clampRoundSeconds, type GameMode } from '@/game/types';
import { DECK_SORTS, type DeckSort } from '@/home/deckOrder';
import type { ThemeChoice } from '@/ui/tokens';
import { DEFAULTS_VERSION, parseDefaultsVersion, upgradeSettings } from './settingsUpgrade';

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
  /** Sound effects: got it, pass, the countdown, time's up, a win. */
  sound: boolean;
  /**
   * How the holder answers. Tilt is the default: tip the phone down for got
   * it, up to pass, the way people expect a forehead game to work. Swipe
   * (up for got it, down to pass, anywhere on the screen) and tap (top half,
   * bottom half) are there for anyone who prefers them.
   */
  inputMode: InputMode;
  /** Dark, light for daylight, or whatever the phone is set to. */
  theme: ThemeChoice;
  /** How decks are ordered after favourites. */
  deckSort: DeckSort;
  boostBrightness: boolean;
  /** Whether the first-launch how-to-play has been seen. */
  onboarded: boolean;
  /** The mode the one-tap shutter on the Play screen starts. */
  quickMode: GameMode;
  /** Round length for one-tap play, in seconds. */
  quickSeconds: number;
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

export type InputMode = 'tilt' | 'swipe' | 'tap';
export const INPUT_MODES: readonly InputMode[] = ['tilt', 'swipe', 'tap'];
const THEMES: readonly ThemeChoice[] = ['dark', 'light', 'system'];

export const defaultAppSettings: Settings = {
  haptics: true,
  sound: true,
  inputMode: 'tilt',
  theme: 'dark',
  deckSort: 'played',
  boostBrightness: true,
  onboarded: false,
  quickMode: 'classic',
  quickSeconds: 60,
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
  settings.quickSeconds = clampRoundSeconds(settings.quickSeconds);
  if (!INPUT_MODES.includes(settings.inputMode)) settings.inputMode = defaultAppSettings.inputMode;
  if (!THEMES.includes(settings.theme)) settings.theme = defaultAppSettings.theme;
  if (!DECK_SORTS.some((s) => s.key === settings.deckSort)) settings.deckSort = defaultAppSettings.deckSort;
  return settings;
}

const DEFAULTS_KEY = 'settings.defaults';

/** Runs any pending one-time default changes, and remembers that it has. */
function applyNewDefaults(settings: Settings): Settings {
  try {
    const saved = parseDefaultsVersion(Storage.getItemSync(DEFAULTS_KEY));
    if (saved >= DEFAULTS_VERSION) return settings;
    const next = upgradeSettings(settings, saved);
    Storage.setItemSync(STORAGE_KEY, JSON.stringify(pick(next)));
    Storage.setItemSync(DEFAULTS_KEY, String(DEFAULTS_VERSION));
    return next;
  } catch {
    return settings;
  }
}

const STORAGE_KEY = 'settings.v1';

function load(): Settings {
  try {
    const raw = Storage.getItemSync(STORAGE_KEY);
    if (!raw) {
      // A fresh install already has the current defaults.
      Storage.setItemSync(DEFAULTS_KEY, String(DEFAULTS_VERSION));
      return defaultAppSettings;
    }

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return defaultAppSettings;

    // Merged over defaults rather than trusted wholesale, so a settings blob
    // written by an older build gains new keys instead of leaving them
    // undefined.
    return applyNewDefaults(sanitise(parsed as Partial<Record<keyof Settings, unknown>>));
  } catch {
    return defaultAppSettings;
  }
}

type SettingsStore = Settings & {
  set<K extends keyof Settings>(key: K, value: Settings[K]): void;
  /**
   * Every style in the app is built for one theme when it loads, so a new
   * theme is saved straight away and the app reloads into it. It takes about
   * a second and nothing is lost: the game, decks and settings are all saved.
   */
  setTheme(theme: ThemeChoice): void;
  resetAll(): void;
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...load(),

  set(key, value) {
    set({ [key]: value } as Pick<Settings, typeof key>);
    persist(get());
  },

  setTheme(theme) {
    const next = { ...get(), theme };
    set({ theme });
    try {
      Storage.setItemSync(STORAGE_KEY, JSON.stringify(pick(next)));
    } catch {
      return;
    }
    void reloadAppAsync('Theme changed').catch(() => undefined);
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
