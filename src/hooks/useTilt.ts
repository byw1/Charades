import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { initialTiltState, stepTilt, type TiltGesture } from '@/game/tilt';

/**
 * Tilt input, wired to the accelerometer.
 *
 * The thresholds and the debouncing live in `@/game/tilt`, which is pure and
 * tested. This hook does the parts that need a device: subscribing, throttling,
 * and tearing the subscription down the moment tilt stops being the input mode.
 */

/**
 * Sample rate. Fast enough that a gesture feels immediate against the 120ms
 * dwell, slow enough not to run the accelerometer flat out for a whole round.
 */
const INTERVAL_MS = 50;

/**
 * How long to wait for a first reading before handing the round back to tap.
 * Tilt is the default, so a sensor that subscribes fine but never reports must
 * not leave a round with no way to answer.
 */
const SILENCE_MS = 1500;

export type UseTiltOptions = {
  /** Subscribe only while tilt is the input mode and a round is running. */
  enabled: boolean;
  onGesture: (gesture: TiltGesture) => void;
};

export type UseTiltResult = {
  /**
   * False once the device has told us it has no accelerometer, or the sensor
   * could not be subscribed to, or it stayed silent. Assumed true until then,
   * so the round starts on tilt without waiting on a check.
   */
  available: boolean;
};

export function useTilt({ enabled, onGesture }: UseTiltOptions): UseTiltResult {
  const [available, setAvailable] = useState(true);

  // Held in a ref so a new callback identity each render does not tear down and
  // rebuild the subscription mid-round.
  const handler = useRef(onGesture);
  useEffect(() => {
    handler.current = onGesture;
  }, [onGesture]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    void Accelerometer.isAvailableAsync()
      .then((ok) => {
        if (!cancelled && !ok) setAvailable(false);
      })
      // A device that will not answer gets the benefit of the doubt; the
      // silence check below catches one that then never reports.
      .catch(() => undefined);

    // Fresh state each time tilt is switched on, so a gesture cannot carry over
    // from an earlier round and the phone has to be seen upright again first.
    let state = initialTiltState();
    let heard = false;

    let subscription: { remove: () => void } | null = null;
    try {
      Accelerometer.setUpdateInterval(INTERVAL_MS);
      subscription = Accelerometer.addListener(({ x, y, z }) => {
        if (!heard) {
          heard = true;
          setAvailable(true);
        }
        const step = stepTilt(state, { x, y, z }, Date.now());
        state = step.state;
        if (step.gesture) handler.current(step.gesture);
      });
    } catch {
      // No sensor module to subscribe to. Left to the silence check, which
      // hands the round back to tap.
    }

    const silence = setTimeout(() => {
      if (!cancelled && !heard) setAvailable(false);
    }, SILENCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(silence);
      subscription?.remove();
    };
  }, [enabled]);

  return { available };
}
