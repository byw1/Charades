import { Orientation, OrientationLock } from 'expo-screen-orientation';

/**
 * The lock that keeps the screen the way it is right now.
 *
 * Deckhead turns with the phone everywhere, except during a running round:
 * the holder tips the phone up and down against their forehead, and a sideways
 * wobble on the way must not spin the card round under them. So the round
 * holds whichever way the phone was being held when it started, portrait or
 * landscape. Null when the phone can't say (flat on a table), in which case
 * nothing is locked.
 */
export function lockFor(orientation: Orientation): OrientationLock | null {
  switch (orientation) {
    case Orientation.PORTRAIT_UP:
      return OrientationLock.PORTRAIT_UP;
    case Orientation.PORTRAIT_DOWN:
      return OrientationLock.PORTRAIT_DOWN;
    case Orientation.LANDSCAPE_LEFT:
      return OrientationLock.LANDSCAPE_LEFT;
    case Orientation.LANDSCAPE_RIGHT:
      return OrientationLock.LANDSCAPE_RIGHT;
    default:
      return null;
  }
}
