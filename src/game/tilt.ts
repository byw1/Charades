/**
 * Tilt input: tip the phone down for got it, up to pass.
 *
 * The rules, in plain terms:
 *
 * 1. **It learns how you hold it.** Nobody holds a phone dead upright on a
 *    forehead — it leans back, a little or a lot. Once the phone has been
 *    steady and roughly upright for a moment, that angle becomes "resting",
 *    and gestures are measured from it rather than from vertical.
 * 2. **A clear tip counts.** About a third of a right angle down from resting
 *    is got it; the same up is pass. A short, natural nod is enough — it does
 *    not have to be held still at the far end.
 * 3. **One tip, one card.** After a gesture the phone has to come back near
 *    resting before the next one counts, so holding it down resolves one card,
 *    not the deck.
 * 4. **Slow drift is not a gesture.** While resting, the resting angle follows
 *    the phone slowly, so sinking lower over a round does not end up as a pass.
 *
 * Input is the gravity vector from the phone's fused motion sensor (gyro and
 * accelerometer together), which stays smooth through jerks and shakes, and
 * which expo-sensors reports in the same convention on iPhone and Android:
 * screen facing the floor reads +z. Units do not matter; it is normalised.
 *
 * Pure: samples in, gestures out. Nothing here knows about sensors or React.
 */

export type TiltGesture = 'correct' | 'pass';

/** Gravity in the device frame, any units. */
export type GravityReading = { x: number; y: number; z: number };

type Phase = 'settling' | 'armed' | 'returning';

export type TiltState = {
  phase: Phase;
  /** The resting angle, in degrees; positive is screen toward the floor. */
  baseline: number | null;
  /** Settling: where the steady stretch started, and when. */
  anchor: number | null;
  since: number | null;
  /** Armed: the gesture being made and when it started. */
  pending: TiltGesture | null;
  pendingSince: number | null;
};

/** How far from resting, in degrees, a tip has to go to count. */
export const TILT_TRIGGER_DEG = 30;
/** How long it has to stay past that, in ms. Short: a nod, not a hold. */
export const TILT_DWELL_MS = 70;
/** How close to resting it has to come back before the next gesture. */
export const TILT_RETURN_DEG = 15;
export const TILT_RETURN_MS = 100;
/** How steady, for how long, before the resting angle is taken. */
export const SETTLE_JITTER_DEG = 8;
export const SETTLE_MS = 250;
/** Further than this from upright is a phone on a table, not a forehead. */
export const MAX_REST_DEG = 60;
/** The resting angle is kept within this, so both gestures stay reachable. */
export const MAX_BASELINE_DEG = 40;
/** How quickly the resting angle follows a slow lean, per sample. */
const DRIFT = 0.04;
/** Inside this of resting, the phone is just being held. */
const STILL_DEG = 10;

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

/**
 * The phone's tip, in degrees: 0 with the screen vertical, +90 face down,
 * -90 face up. The same whether it is held upright or sideways. Null for a
 * reading with no direction (all zeros).
 */
export function pitchOf(gravity: GravityReading): number | null {
  const magnitude = Math.hypot(gravity.x, gravity.y, gravity.z);
  if (!Number.isFinite(magnitude) || magnitude < 1e-6) return null;
  return (Math.asin(Math.max(-1, Math.min(1, gravity.z / magnitude))) * 180) / Math.PI;
}

/**
 * Settling to begin with, deliberately. The phone is still on its way to a
 * forehead when the round opens, and that journey passes every angle there is.
 */
export function initialTiltState(): TiltState {
  return { phase: 'settling', baseline: null, anchor: null, since: null, pending: null, pendingSince: null };
}

export type TiltStep = {
  state: TiltState;
  /** Set on the sample that completes a gesture, null on every other sample. */
  gesture: TiltGesture | null;
};

const none = (state: TiltState): TiltStep => ({ state, gesture: null });

/** Advances by one sample. Callers hold the state and feed it back in. */
export function stepTilt(state: TiltState, gravity: GravityReading, now: number): TiltStep {
  const pitch = pitchOf(gravity);
  if (pitch === null) return none(state);

  switch (state.phase) {
    case 'settling': {
      if (Math.abs(pitch) > MAX_REST_DEG) return none({ ...state, anchor: null, since: null });
      if (state.anchor === null || state.since === null || Math.abs(pitch - state.anchor) > SETTLE_JITTER_DEG) {
        return none({ ...state, anchor: pitch, since: now });
      }
      if (now - state.since < SETTLE_MS) return none(state);
      return none({ ...initialTiltState(), phase: 'armed', baseline: clamp(pitch, MAX_BASELINE_DEG) });
    }

    case 'returning': {
      const baseline = state.baseline ?? 0;
      if (Math.abs(pitch - baseline) > TILT_RETURN_DEG) return none({ ...state, since: null });
      if (state.since === null) return none({ ...state, since: now });
      if (now - state.since < TILT_RETURN_MS) return none(state);
      // Back at rest: meet the phone halfway, in case it settled a bit off.
      return none({
        ...initialTiltState(),
        phase: 'armed',
        baseline: clamp((baseline + pitch) / 2, MAX_BASELINE_DEG),
      });
    }

    case 'armed': {
      const baseline = state.baseline ?? 0;
      const delta = pitch - baseline;
      const candidate: TiltGesture | null =
        delta >= TILT_TRIGGER_DEG ? 'correct' : delta <= -TILT_TRIGGER_DEG ? 'pass' : null;

      if (candidate === null) {
        // Just being held: follow a slow lean so it never accumulates.
        const next = Math.abs(delta) < STILL_DEG ? clamp(baseline + DRIFT * delta, MAX_BASELINE_DEG) : baseline;
        return none({ ...state, baseline: next, pending: null, pendingSince: null });
      }

      // A new direction restarts the clock.
      if (state.pending !== candidate || state.pendingSince === null) {
        return none({ ...state, pending: candidate, pendingSince: now });
      }
      if (now - state.pendingSince < TILT_DWELL_MS) return none(state);

      return {
        state: { ...state, phase: 'returning', since: null, pending: null, pendingSince: null },
        gesture: candidate,
      };
    }
  }
}
