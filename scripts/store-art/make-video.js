// Turns a folder of frames (+ cues.json) into an App Store-ready .mp4:
// H.264 High, 30 fps, AAC stereo, with the music bed and the game's own
// sound effects placed on their cues. (amix divides by its input count, so
// every input is padded to full length and the sum is scaled back up.)
// Usage: node scripts/store-art/make-video.js <frames dir> <out.mp4>
// Needs ffmpeg on PATH, or FFMPEG=/path/to/ffmpeg.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const [dir, out] = process.argv.slice(2);
const { fps, frames, cues } = JSON.parse(fs.readFileSync(path.join(dir, 'cues.json'), 'utf8'));
const seconds = frames / fps;
const sounds = path.join(__dirname, '..', '..', 'assets', 'sounds');
const ext = fs.existsSync(path.join(dir, 'f00000.jpg')) ? 'jpg' : 'png';

const music = path.join(dir, 'music.wav');
execFileSync('node', [path.join(__dirname, 'music.js'), music, String(seconds)], { stdio: 'inherit' });

const inputs = ['-framerate', String(fps), '-i', path.join(dir, `f%05d.${ext}`), '-i', music];
const filters = ['[1:a]volume=0.5[m]'];
const mix = ['[m]'];
cues.forEach((c, i) => {
  inputs.push('-i', path.join(sounds, `${c.name}.wav`));
  const ms = Math.max(0, Math.round(c.at * 1000));
  filters.push(`[${i + 2}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${ms}|${ms},volume=${c.name === 'tick' ? 0.5 : 0.9},apad[s${i}]`);
  mix.push(`[s${i}]`);
});
filters.push(`${mix.join('')}amix=inputs=${mix.length}:duration=first,volume=${mix.length},aformat=sample_rates=48000:channel_layouts=stereo,alimiter=limit=0.95[a]`);

fs.mkdirSync(path.dirname(out), { recursive: true });
execFileSync(FFMPEG, [
  '-y', '-hide_banner', '-loglevel', 'error', ...inputs,
  '-filter_complex', filters.join(';'),
  '-map', '0:v', '-map', '[a]',
  '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.0', '-pix_fmt', 'yuv420p', '-r', String(fps),
  '-b:v', '9M', '-maxrate', '11M', '-bufsize', '18M', '-preset', 'slow',
  '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
  '-t', seconds.toFixed(3), '-movflags', '+faststart', out,
], { stdio: 'inherit' });
console.log('wrote', out, `${seconds.toFixed(1)} s`);
