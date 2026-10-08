import { Orientation, OrientationLock } from 'expo-screen-orientation';
import { lockFor } from './orientationLock';

// Hoisted above the imports by Jest.
jest.mock('expo-screen-orientation', () => ({
  Orientation: { UNKNOWN: 0, PORTRAIT_UP: 1, PORTRAIT_DOWN: 2, LANDSCAPE_LEFT: 3, LANDSCAPE_RIGHT: 4 },
  OrientationLock: { DEFAULT: 0, PORTRAIT_UP: 3, PORTRAIT_DOWN: 4, LANDSCAPE_LEFT: 6, LANDSCAPE_RIGHT: 7 },
}));


describe('lockFor', () => {
  it('holds a portrait round in portrait', () => {
    expect(lockFor(Orientation.PORTRAIT_UP)).toBe(OrientationLock.PORTRAIT_UP);
  });

  it('holds a sideways round on the side it started on', () => {
    expect(lockFor(Orientation.LANDSCAPE_LEFT)).toBe(OrientationLock.LANDSCAPE_LEFT);
    expect(lockFor(Orientation.LANDSCAPE_RIGHT)).toBe(OrientationLock.LANDSCAPE_RIGHT);
  });

  it('locks nothing when the phone cannot tell', () => {
    expect(lockFor(Orientation.UNKNOWN)).toBeNull();
  });
});
