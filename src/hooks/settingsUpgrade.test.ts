import { DEFAULTS_VERSION, parseDefaultsVersion, upgradeSettings } from './settingsUpgrade';

describe('upgradeSettings', () => {
  it('switches a phone that saved settings before tilt was the default', () => {
    expect(upgradeSettings({ inputMode: 'tap' as const, haptics: false }, 1)).toEqual({ inputMode: 'tilt', haptics: false });
  });

  it('leaves a phone alone once it has had the upgrade, so choosing tap sticks', () => {
    expect(upgradeSettings({ inputMode: 'tap' as const }, DEFAULTS_VERSION)).toEqual({ inputMode: 'tap' });
  });
});

describe('parseDefaultsVersion', () => {
  it('treats a missing or unreadable marker as the oldest version', () => {
    expect(parseDefaultsVersion(null)).toBe(1);
    expect(parseDefaultsVersion('banana')).toBe(1);
    expect(parseDefaultsVersion('2')).toBe(2);
  });
});
