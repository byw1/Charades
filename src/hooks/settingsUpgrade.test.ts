import { DEFAULTS_VERSION, parseDefaultsVersion, upgradeSettings } from './settingsUpgrade';

describe('upgradeSettings', () => {
  it('switches a phone that saved settings before tilt was the default', () => {
    expect(upgradeSettings({ inputMode: 'tap' as const, sound: true, haptics: false }, 1)).toMatchObject({
      inputMode: 'tilt',
      haptics: false,
    });
  });

  it('turns sound effects on once for phones that saved the old dead switch', () => {
    expect(upgradeSettings({ inputMode: 'swipe' as const, sound: false }, 2)).toEqual({ inputMode: 'swipe', sound: true });
  });

  it('leaves a phone alone once it has had the upgrades, so choices stick', () => {
    expect(upgradeSettings({ inputMode: 'tap' as const, sound: false }, DEFAULTS_VERSION)).toEqual({ inputMode: 'tap', sound: false });
  });
});

describe('parseDefaultsVersion', () => {
  it('treats a missing or unreadable marker as the oldest version', () => {
    expect(parseDefaultsVersion(null)).toBe(1);
    expect(parseDefaultsVersion('banana')).toBe(1);
    expect(parseDefaultsVersion('2')).toBe(2);
  });
});
