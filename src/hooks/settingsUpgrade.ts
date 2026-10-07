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
 */

export const DEFAULTS_VERSION = 2;

type Upgradable = { inputMode: 'tap' | 'tilt' };

export function upgradeSettings<T extends Upgradable>(settings: T, savedVersion: number): T {
  let next = settings;
  if (savedVersion < 2) next = { ...next, inputMode: 'tilt' };
  return next;
}

/** Reads a stored version marker; anything unreadable is the oldest version. */
export function parseDefaultsVersion(raw: string | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
