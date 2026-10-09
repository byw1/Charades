// A short, bouncy music bed for the videos, synthesised from scratch so there
// is nothing to license. 124 bpm, I-V-vi-IV in C, kick/clap/hats, bass, stabs.
// Usage: node scripts/store-art/music.js <out.wav> <seconds>
const fs = require('fs');

const [out, secondsArg] = process.argv.slice(2);
const RATE = 44100;
const seconds = Number(secondsArg || 30);
const N = Math.ceil(seconds * RATE);
const L = new Float32Array(N);
const R = new Float32Array(N);
const BPM = 124;
const beat = 60 / BPM;

let seed = 12345;
const noise = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2147483648 - 1);
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function add(start, dur, fn, pan = 0, gain = 1) {
  const s0 = Math.floor(start * RATE);
  const n = Math.floor(dur * RATE);
  for (let i = 0; i < n && s0 + i < N; i++) {
    const v = fn(i / RATE) * gain;
    L[s0 + i] += v * (1 - Math.max(0, pan));
    R[s0 + i] += v * (1 + Math.min(0, pan));
  }
}

function kick(t) {
  let ph = 0;
  add(t, 0.32, (x) => {
    const f = 45 + 95 * Math.exp(-x * 28);
    ph += (2 * Math.PI * f) / RATE;
    return Math.sin(ph) * Math.exp(-x * 9) * 0.95;
  });
}
function clap(t) {
  let lp = 0;
  add(t, 0.18, (x) => {
    const n = noise();
    lp += 0.35 * (n - lp);
    const env = Math.exp(-x * 22) * (x < 0.01 ? 0.6 : 1) + (x > 0.012 && x < 0.022 ? 0.4 : 0);
    return (n - lp) * env * 0.45;
  }, 0, 1);
}
function hat(t, open = false) {
  let lp = 0;
  add(t, open ? 0.14 : 0.05, (x) => {
    const n = noise();
    lp += 0.6 * (n - lp);
    return (n - lp) * Math.exp(-x * (open ? 28 : 70)) * 0.22;
  }, 0.25);
}
function bass(t, midi, dur) {
  let ph = 0; let lp = 0;
  const f = hz(midi);
  add(t, dur, (x) => {
    ph += f / RATE;
    const saw = 2 * (ph % 1) - 1;
    const cutoff = 0.05 + 0.25 * Math.exp(-x * 14);
    lp += cutoff * (saw - lp);
    return lp * Math.min(1, x * 300) * Math.exp(-x * 3) * 0.55;
  });
}
function stab(t, notes, pan) {
  for (const m of notes) {
    let ph = 0; let lp = 0;
    const f = hz(m);
    add(t, 0.22, (x) => {
      ph += f / RATE;
      const sq = (ph % 1) < 0.5 ? 1 : -1;
      lp += 0.12 * (sq - lp);
      return lp * Math.exp(-x * 13) * 0.07;
    }, pan);
  }
}
function pluck(t, midi) {
  let ph = 0;
  const f = hz(midi);
  add(t, 0.3, (x) => {
    ph += f / RATE;
    return (Math.sin(2 * Math.PI * ph) + 0.3 * Math.sin(4 * Math.PI * ph)) * Math.exp(-x * 10) * 0.12;
  }, -0.2);
}

// C, G, Am, F; a bar each.
const bars = [
  { root: 36, chord: [60, 64, 67] },
  { root: 43, chord: [59, 62, 67] },
  { root: 45, chord: [60, 64, 69] },
  { root: 41, chord: [60, 65, 69] },
];
const melody = [72, 74, 76, 79, 76, 74, 72, 67, 69, 72, 74, 72, 69, 67, 65, 67];
const barLen = beat * 4;
for (let b = 0; b * barLen < seconds; b++) {
  const t0 = b * barLen;
  const { root, chord } = bars[b % 4];
  const intro = b < 1;
  for (let q = 0; q < 4; q++) {
    const t = t0 + q * beat;
    if (!intro || q >= 2) kick(t);
    if (!intro && (q === 1 || q === 3)) clap(t);
    hat(t + beat / 2, q === 3);
    hat(t + beat / 4); hat(t + (3 * beat) / 4);
    if (!intro) {
      bass(t + beat / 2, root + 12, beat * 0.45);
      bass(t, root, beat * 0.4);
    }
    stab(t + beat / 2, chord, q % 2 ? 0.3 : -0.3);
  }
  if (b % 2 === 1) for (let i = 0; i < 8; i++) pluck(t0 + i * (beat / 2), melody[(i + (b % 4 === 3 ? 8 : 0)) % 16]);
}

// Fades, gentle limiting, 16-bit WAV.
const fadeIn = 0.25 * RATE; const fadeOut = 1.4 * RATE;
let peak = 0;
for (let i = 0; i < N; i++) {
  const g = Math.min(1, i / fadeIn) * Math.min(1, (N - i) / fadeOut);
  L[i] = Math.tanh(L[i] * 1.2) * g; R[i] = Math.tanh(R[i] * 1.2) * g;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.8 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(L[i] * norm * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(R[i] * norm * 32767), 46 + i * 4);
}
fs.writeFileSync(out, buf);
console.log('wrote', out, seconds, 's');
