import { initialTiltState, pitchOf, stepTilt, type GravityReading, type TiltGesture, type TiltState } from './tilt';

/**
 * Motion traces, not single samples: a phone going up to a forehead, held,
 * nodded, flicked, wobbled. Gravity is built from a pitch angle, upright or
 * sideways, the way the fused sensor reports it (screen to the floor is +z).
 */

const STEP = 40; // ms between samples, as the hook asks for

function gravity(pitchDeg: number, sideways = false): GravityReading {
  const r = (pitchDeg * Math.PI) / 180;
  const along = -Math.cos(r);
  return sideways ? { x: along, y: 0, z: Math.sin(r) } : { x: 0, y: along, z: Math.sin(r) };
}

/** Feeds pitches through the machine; returns every gesture and the end state. */
function play(pitches: number[], options: { sideways?: boolean; state?: TiltState; start?: number } = {}) {
  let state = options.state ?? initialTiltState();
  let now = options.start ?? 0;
  const gestures: TiltGesture[] = [];
  for (const pitch of pitches) {
    const step = stepTilt(state, gravity(pitch, options.sideways), now);
    state = step.state;
    if (step.gesture) gestures.push(step.gesture);
    now += STEP;
  }
  return { gestures, state, now };
}

const hold = (pitch: number, ms: number) => Array<number>(Math.ceil(ms / STEP)).fill(pitch);
const ramp = (from: number, to: number, ms: number) => {
  const n = Math.ceil(ms / STEP);
  return Array.from({ length: n }, (_, i) => from + ((to - from) * (i + 1)) / n);
};

/** Picked up off a table and held on a forehead, leaning back a little. */
const ontoForehead = (rest = -10) => [...ramp(-85, rest, 400), ...hold(rest, 400)];

describe('pitchOf', () => {
  it('reads upright as 0, face down as +90 and face up as -90', () => {
    expect(pitchOf(gravity(0))).toBeCloseTo(0);
    expect(pitchOf(gravity(90))).toBeCloseTo(90);
    expect(pitchOf(gravity(-90))).toBeCloseTo(-90);
  });

  it('does not care about units or which way up the phone is held', () => {
    expect(pitchOf({ x: 0, y: -8.487, z: 4.9 })).toBeCloseTo(30, 1);
    expect(pitchOf(gravity(30, true))).toBeCloseTo(30);
  });

  it('has nothing to say about an empty reading', () => {
    expect(pitchOf({ x: 0, y: 0, z: 0 })).toBeNull();
  });
});

describe('tilt', () => {
  it('fires nothing on the way up to the forehead', () => {
    expect(play(ontoForehead()).gestures).toEqual([]);
  });

  it('takes how you hold it as resting', () => {
    const { state } = play(ontoForehead(-25));
    expect(state.phase).toBe('armed');
    expect(state.baseline).toBeCloseTo(-25, 0);
  });

  it('never arms on a table', () => {
    expect(play(hold(-88, 3000)).state.phase).toBe('settling');
  });

  it('reads a nod down as got it and a nod up as pass', () => {
    const start = play(ontoForehead());
    const down = play([...ramp(-10, 35, 160), ...hold(35, 120)], { state: start.state, start: start.now });
    expect(down.gestures).toEqual(['correct']);

    const up = play(ontoForehead());
    expect(play([...ramp(-10, -55, 160), ...hold(-55, 120)], { state: up.state, start: up.now }).gestures).toEqual(['pass']);
  });

  it('works for someone who leans right back', () => {
    // Resting at 25 degrees back: a nod to just past upright is got it.
    const start = play(ontoForehead(-25));
    const nod = play([...ramp(-25, 10, 160), ...hold(10, 120)], { state: start.state, start: start.now });
    expect(nod.gestures).toEqual(['correct']);
  });

  it('catches a quick flick down and back', () => {
    const start = play(ontoForehead());
    const flick = play([...ramp(-10, 40, 80), ...hold(40, 80), ...ramp(40, -10, 80)], { state: start.state, start: start.now });
    expect(flick.gestures).toEqual(['correct']);
  });

  it('ignores a single spike', () => {
    const start = play(ontoForehead());
    expect(play([-10, 45, -10, -10], { state: start.state, start: start.now }).gestures).toEqual([]);
  });

  it('ignores wobbling while someone gives clues', () => {
    const start = play(ontoForehead());
    const wobble = [-10, 5, -18, 8, -22, 2, -15, 10, -20, -5, 3, -12].flatMap((p) => hold(p, 80));
    expect(play(wobble, { state: start.state, start: start.now }).gestures).toEqual([]);
  });

  it('counts one card for a tip that is held, then needs a return', () => {
    const start = play(ontoForehead());
    const held = play([...ramp(-10, 40, 120), ...hold(40, 2000)], { state: start.state, start: start.now });
    expect(held.gestures).toEqual(['correct']);

    const back = play([...ramp(40, -10, 160), ...hold(-10, 200), ...ramp(-10, 40, 120), ...hold(40, 200)], {
      state: held.state,
      start: held.now,
    });
    expect(back.gestures).toEqual(['correct']);
  });

  it('does not let a slow sink over a round turn into a pass', () => {
    const start = play(ontoForehead(-5));
    // Forty degrees of droop over twenty seconds.
    const sink = play(ramp(-5, -45, 20_000), { state: start.state, start: start.now });
    expect(sink.gestures).toEqual([]);
  });

  it('works the same held sideways', () => {
    const start = play(ontoForehead(), { sideways: true });
    const nods = play([...ramp(-10, 40, 120), ...hold(40, 120), ...ramp(40, -10, 120), ...hold(-10, 200), ...ramp(-10, -55, 120), ...hold(-55, 120)], {
      sideways: true,
      state: start.state,
      start: start.now,
    });
    expect(nods.gestures).toEqual(['correct', 'pass']);
  });

  it('plays a quick run of cards', () => {
    const start = play(ontoForehead());
    const nod = (to: number) => [...ramp(-10, to, 120), ...hold(to, 100), ...ramp(to, -10, 120), ...hold(-10, 160)];
    const run = play([...nod(40), ...nod(-50), ...nod(40), ...nod(40)], { state: start.state, start: start.now });
    expect(run.gestures).toEqual(['correct', 'pass', 'correct', 'correct']);
  });
});
