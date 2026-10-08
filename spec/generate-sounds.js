/**
 * Synthesises the app's sound effects into assets/sounds as small WAV files.
 *
 * Generated rather than downloaded so every sound is ours, offline and free to
 * ship: a handful of tones, envelopes and a little noise. Run with
 * `node spec/generate-sounds.js` after changing anything here.
 */
const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');

const RATE = 22050;
const OUT = path.join(__dirname, '..', 'assets', 'sounds');

/** A buffer of `seconds` of silence to mix into. */
const silence = (seconds) => new Float32Array(Math.round(seconds * RATE));

/** Adds a note: a few harmonics under an attack/decay envelope. */
function note(buf, { at = 0, freq, dur, gain = 0.5, attack = 0.005, harmonics = [1, 0.35, 0.12], slide = 0, shape = 'sine' }) {
  const start = Math.round(at * RATE);
  const length = Math.round(dur * RATE);
  for (let i = 0; i < length && start + i < buf.length; i++) {
    const t = i / RATE;
    const f = freq + slide * (t / dur);
    const env = Math.min(1, t / attack) * Math.exp((-4.5 * t) / dur);
    let v = 0;
    harmonics.forEach((h, k) => {
      const phase = 2 * Math.PI * f * (k + 1) * t;
      v += h * (shape === 'square' ? Math.sign(Math.sin(phase)) * 0.6 : Math.sin(phase));
    });
    buf[start + i] += v * env * gain;
  }
}

/** Filtered noise with a falling cutoff: a whoosh. */
function whoosh(buf, { at = 0, dur, gain = 0.5 }) {
  const start = Math.round(at * RATE);
  const length = Math.round(dur * RATE);
  let low = 0;
  let seed = 7;
  for (let i = 0; i < length && start + i < buf.length; i++) {
    const t = i / length;
    seed = (seed * 16807) % 2147483647;
    const noise = (seed / 2147483647) * 2 - 1;
    const cutoff = 0.35 * (1 - t) + 0.02;
    low += cutoff * (noise - low);
    const env = Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 2;
    buf[start + i] += low * env * gain * 3;
  }
}

function writeWav(name, buf) {
  const peak = buf.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  const scale = 0.89 / peak;
  const data = Buffer.alloc(buf.length * 2);
  buf.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * scale)) * 32767), i * 2));

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  fs.writeFileSync(path.join(OUT, `${name}.wav`), Buffer.concat([header, data]));
  console.log(`${name}.wav`.padEnd(14), `${((44 + data.length) / 1024).toFixed(1)} KB`);
}

fs.mkdirSync(OUT, { recursive: true });

// Got it: a bright two-note chime, up a fifth.
{
  const b = silence(0.45);
  note(b, { freq: 1046.5, dur: 0.18, gain: 0.5 });
  note(b, { at: 0.09, freq: 1568, dur: 0.34, gain: 0.55 });
  writeWav('correct', b);
}

// Pass: a soft whoosh with a low blip under it.
{
  const b = silence(0.4);
  whoosh(b, { dur: 0.38, gain: 0.7 });
  note(b, { at: 0.02, freq: 330, dur: 0.22, gain: 0.25, slide: -120 });
  writeWav('pass', b);
}

// Busted: a low, buzzy double honk.
{
  const b = silence(0.55);
  note(b, { freq: 155, dur: 0.22, gain: 0.5, shape: 'square', harmonics: [1, 0.5, 0.3] });
  note(b, { at: 0.24, freq: 130, dur: 0.3, gain: 0.5, shape: 'square', harmonics: [1, 0.5, 0.3] });
  writeWav('busted', b);
}

// Countdown tick, and the higher go.
{
  const b = silence(0.18);
  note(b, { freq: 880, dur: 0.16, gain: 0.45, harmonics: [1, 0.2] });
  writeWav('tick', b);
}
{
  const b = silence(0.4);
  note(b, { freq: 1318.5, dur: 0.38, gain: 0.5, harmonics: [1, 0.3, 0.1] });
  writeWav('go', b);
}

// Time's up: a game-show buzzer.
{
  const b = silence(0.8);
  note(b, { freq: 220, dur: 0.75, gain: 0.45, attack: 0.01, shape: 'square', harmonics: [1, 0.6, 0.4, 0.2] });
  note(b, { freq: 233, dur: 0.75, gain: 0.3, attack: 0.01, shape: 'square', harmonics: [1, 0.5] });
  writeWav('timeup', b);
}

// Win: a quick rising arpeggio landing on a chord.
{
  const b = silence(1.3);
  [523.25, 659.25, 783.99].forEach((f, i) => note(b, { at: i * 0.1, freq: f, dur: 0.22, gain: 0.4 }));
  [1046.5, 1318.5, 1568].forEach((f) => note(b, { at: 0.32, freq: f, dur: 0.95, gain: 0.3 }));
  writeWav('win', b);
}
