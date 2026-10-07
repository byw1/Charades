/**
 * One-time changes to saved settings when a default changes.
 *
 * Every saved settings blob records every setting, chosen or not, so a new
 * default would never reach a phone that has saved once. Each entry here runs
 * once per phone, in order, and is then remembered as done.
 *
 * 2: tilt became the default. Before it, every saved blob said "tap" whether
 *    or not anyone chose it, so it is switched once. Anyone who wants tap back
 *    picks it in Settings and it sticks.
 * 3: sound effects arrived, on by default. The old "sound" switch never did
 *    anything and every saved blob says off, so it is switched on once.
 */

export const DEFAULTS_VERSION = 3;

type Upgradable = { inputMode: 'tap' | 'tilt' | 'swipe'; sound: boolean };

export function upgradeSettings<T extends Upgradable>(settings: T, savedVersion: number): T {
  let next = settings;
  if (savedVersion < 2) next = { ...next, inputMode: 'tilt' };
  if (savedVersion < 3) next = { ...next, sound: true };
  return next;
}

/** Reads a stored version marker; anything unreadable is the oldest version. */
export function parseDefaultsVersion(raw: string | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
