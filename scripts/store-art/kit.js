// Building blocks for the store art: a 3D phone with a real app screen in it,
// Dex, chunky 3D cards, stickers, pills and confetti. Plain DOM + CSS 3D, so
// Chromium renders it and Playwright photographs it, one frame at a time.

const C = {
  yellow: '#FFE500', yellowDeep: '#E6CE00',
  green: '#2EE86F', greenDeep: '#1FB855',
  orange: '#FF6B2C', orangeDeep: '#E0541A',
  blue: '#2EA8FF', blueDeep: '#1388E0',
  pink: '#FF3D8B', pinkDeep: '#E0226F',
  purple: '#9B5CFF', purpleDeep: '#7B3DE6',
  red: '#FF3B47', redDeep: '#D92632',
  ink: '#0A0A0D', white: '#FFFFFF', cheek: '#FF7FB0',
};

const SCREEN = { w: 440, h: 956, top: 62, bottom: 34 };

function el(tag, style = {}, parent) {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (parent) parent.appendChild(node);
  return node;
}

/** Deterministic randomness so every render of a frame is identical. */
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ---------------------------------------------------------------- Dex

function dexSvg(mood = 'happy', tint = C.purple, glyph = '?') {
  const INK = C.ink;
  const line = `stroke="${INK}" stroke-width="4" stroke-linecap="round" fill="none"`;
  const eye = (cx, at = { x: 0, y: 0 }, tall = 9.5) =>
    `<ellipse cx="${cx + at.x}" cy="${81 + at.y}" rx="7.5" ry="${tall}" fill="${INK}"/>` +
    `<circle cx="${cx + 2.6 + at.x}" cy="${76.5 + at.y}" r="3" fill="#fff"/>` +
    `<circle cx="${cx - 2.4 + at.x}" cy="${85.5 + at.y}" r="1.4" fill="#fff"/>`;
  let eyes;
  if (mood === 'excited') eyes = `<path d="M37 84 Q44 74 51 84 M69 84 Q76 74 83 84" ${line}/>`;
  else if (mood === 'sleepy') eyes = `<path d="M37 82 Q44 88 51 82 M69 82 Q76 88 83 82" ${line}/>`;
  else if (mood === 'wink') eyes = eye(44) + `<path d="M69 82 Q76 75 83 82" ${line}/>`;
  else if (mood === 'wow') eyes = eye(44, undefined, 11) + eye(76, undefined, 11);
  else eyes = eye(44) + eye(76);
  const mouths = {
    excited: `<path d="M50 94 Q60 108 70 94 Z" fill="${INK}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="60" cy="101.5" rx="5" ry="3" fill="${C.cheek}"/>`,
    wow: `<ellipse cx="60" cy="100" rx="4.5" ry="5.5" fill="${INK}"/>`,
    happy: `<path d="M52 95 Q56 100.5 60 96 Q64 100.5 68 95" ${line} stroke-width="3.5"/>`,
  };
  const mouth = mouths[mood] || mouths.happy;
  return `<svg viewBox="-6 -6 132 132" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="overflow:visible">
    <g fill="#fff" stroke="#fff" stroke-width="12" stroke-linejoin="round">
      <ellipse cx="60" cy="73" rx="42" ry="39"/>
      <g transform="rotate(-9 60 30)"><rect x="40" y="5" width="40" height="50" rx="9"/></g>
    </g>
    <ellipse cx="60" cy="73" rx="42" ry="39" fill="${tint}" stroke="${INK}" stroke-width="3.5"/>
    <ellipse cx="60" cy="86" rx="30" ry="20" fill="#fff" opacity="0.08"/>
    <ellipse cx="34" cy="60" rx="5" ry="9" fill="#fff" opacity="0.28" transform="rotate(20 34 60)"/>
    <ellipse cx="30" cy="93" rx="8" ry="5" fill="${C.cheek}" opacity="0.85"/>
    <ellipse cx="90" cy="93" rx="8" ry="5" fill="${C.cheek}" opacity="0.85"/>
    ${eyes}${mouth}
    <g class="dex-card" style="transform-origin:64px 55px">
      <g transform="rotate(-9 60 30)">
        <rect x="40" y="5" width="40" height="50" rx="9" fill="${C.yellow}" stroke="${INK}" stroke-width="4"/>
        <text x="60" y="40" font-size="${glyph.length > 1 ? 18 : 30}" font-family="Display" font-weight="800" fill="${INK}" text-anchor="middle">${glyph}</text>
      </g>
    </g>
  </svg>`;
}

function dex({ mood = 'happy', size = 300, x = 0, y = 0, rot = 0, tint, glyph, z = 0 } = {}, parent) {
  const wrap = el('div', { position: 'absolute', left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px`, transform: `translateZ(${z}px) rotate(${rot}deg)`, filter: `drop-shadow(0 ${size * 0.06}px ${size * 0.05}px rgba(0,0,0,.28))` }, parent);
  wrap.innerHTML = dexSvg(mood, tint, glyph);
  wrap.className = 'dex';
  return wrap;
}

// ---------------------------------------------------------------- phone

/** Samples a screen image's top and bottom rows, so the status bar and the
 * home-indicator strip carry on the app's own colour. */
const edgeCache = new Map();
function edgeColours(src) {
  if (!edgeCache.has(src)) edgeCache.set(src, readEdges(src));
  return edgeCache.get(src);
}
async function readEdges(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const at = (y) => {
    const d = g.getImageData(Math.floor(img.naturalWidth * 0.5), y, 1, 1).data;
    return [d[0], d[1], d[2]];
  };
  const top = at(2); const bottom = at(img.naturalHeight - 3);
  const css = ([r, g2, b]) => `rgb(${r},${g2},${b})`;
  const light = ([r, g2, b]) => 0.299 * r + 0.587 * g2 + 0.114 * b > 150;
  return { top: css(top), bottom: css(bottom), topInk: light(top) ? '#000' : '#fff', bottomInk: light(bottom) ? '#000' : '#fff' };
}

function statusBar(ink, s) {
  return `<div style="position:absolute;left:0;right:0;top:0;height:${SCREEN.top * s}px;display:flex;align-items:center;justify-content:space-between;padding:${6 * s}px ${34 * s}px 0 ${50 * s}px;box-sizing:border-box;color:${ink};font:600 ${17.5 * s}px/1 Text">
    <span style="letter-spacing:-0.02em">9:41</span>
    <span style="display:flex;gap:${6 * s}px;align-items:center">
      <svg width="${18 * s}" height="${12 * s}" viewBox="0 0 18 12" fill="${ink}"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
      <svg width="${16 * s}" height="${12 * s}" viewBox="0 0 16 12" fill="${ink}"><path d="M8 2.6c2.4 0 4.6.9 6.2 2.5l1.1-1.2A10.4 10.4 0 0 0 8 1 10.4 10.4 0 0 0 .7 3.9l1.1 1.2A8.8 8.8 0 0 1 8 2.6Zm0 3.4c1.5 0 2.9.6 4 1.6l1.1-1.2A7.3 7.3 0 0 0 8 4.4c-2 0-3.8.8-5.1 2l1.1 1.2c1.1-1 2.5-1.6 4-1.6Zm0 3.3c.7 0 1.3.3 1.8.7L8 11.9 6.2 10c.5-.4 1.1-.7 1.8-.7Z"/></svg>
      <svg width="${27 * s}" height="${13 * s}" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="${ink}" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.5" fill="${ink}"/><path d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2Z" fill="${ink}" opacity=".45"/></svg>
    </span>
  </div>`;
}

/**
 * A phone, standing in 3D. `w` is the device width in px; the screen inside
 * is an app capture (440 x 860 pt: the iPhone screen less its status bar and
 * home-indicator strips, which are drawn here in the app's own colours).
 */
async function phone({ src, w = 800, x = 0, y = 0, rx = 0, ry = 0, rz = 0, z = 0, depth, shadow = true, glare = true, landscape = false } = {}, parent) {
  // Sideways, `w` is still the width on the page: the long side.
  const SW = landscape ? SCREEN.h : SCREEN.w;
  const SH = landscape ? SCREEN.w : SCREEN.h;
  const short = landscape ? (w * SCREEN.w) / SCREEN.h : w;
  const bezel = short * 0.03;
  const sw = w - bezel * 2;
  const s = sw / SW;
  const sh = SH * s;
  const h = sh + bezel * 2;
  const r = short * 0.155;
  const sr = r - bezel;
  const T = depth ?? short * 0.045;
  const colours = src ? await edgeColours(src) : { top: '#000', bottom: '#000', topInk: '#fff', bottomInk: '#fff' };

  const root = el('div', { position: 'absolute', left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, transformStyle: 'preserve-3d', transform: `translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)` }, parent);
  root.className = 'phone';

  if (shadow) {
    el('div', { position: 'absolute', left: `${w * 0.03}px`, top: `${h * 0.05}px`, width: `${w * 0.95}px`, height: `${h}px`, borderRadius: `${r}px`, background: 'rgba(0,0,0,.38)', filter: `blur(${short * 0.06}px)`, transform: `translateZ(${-T - 60}px) translate(${short * 0.07}px, ${short * 0.1}px)` }, root);
  }
  // The titanium edge: thin slices stacked back to front.
  const slices = Math.max(8, Math.round(T / 2));
  for (let i = slices; i >= 1; i--) {
    const k = i / slices;
    const shade = Math.round(70 + 60 * (1 - Math.abs(k - 0.45) * 1.6));
    el('div', { position: 'absolute', inset: '0', borderRadius: `${r}px`, background: `rgb(${shade},${shade},${shade + 6})`, transform: `translateZ(${-T * k}px)` }, root);
  }
  // Front glass and bezel.
  const face = el('div', { position: 'absolute', inset: '0', borderRadius: `${r}px`, background: '#050506', boxShadow: `inset 0 0 0 ${short * 0.004}px rgba(255,255,255,.18)` }, root);
  const screen = el('div', { position: 'absolute', left: `${bezel}px`, top: `${bezel}px`, width: `${sw}px`, height: `${sh}px`, borderRadius: `${sr}px`, overflow: 'hidden', background: colours.top }, face);
  screen.className = 'screen';
  if (landscape) {
    const app = el('div', { position: 'absolute', inset: '0', backgroundSize: 'cover', backgroundPosition: 'center', backgroundImage: src ? `url("${src}")` : 'none' }, screen);
    app.className = 'app';
    el('div', { position: 'absolute', left: '50%', bottom: `${7 * s}px`, width: `${200 * s}px`, height: `${5 * s}px`, marginLeft: `${-100 * s}px`, borderRadius: `${3 * s}px`, background: colours.bottomInk, opacity: '.85' }, screen);
    el('div', { position: 'absolute', top: '50%', left: `${11 * s}px`, width: `${37 * s}px`, height: `${126 * s}px`, marginTop: `${-63 * s}px`, borderRadius: `${19 * s}px`, background: '#000' }, screen);
    if (glare) el('div', { position: 'absolute', inset: '0', borderRadius: `${sr}px`, background: 'linear-gradient(160deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,.04) 30%, rgba(255,255,255,0) 45%)' }, screen);
    root.swap = (next) => { app.style.backgroundImage = `url("${next}")`; };
    root.app = app; root.screen = screen; root.dims = { w, h, s, sw, sh, bezel };
    return root;
  }
  const app = el('div', { position: 'absolute', left: '0', top: `${SCREEN.top * s}px`, width: `${sw}px`, height: `${(SCREEN.h - SCREEN.top - SCREEN.bottom) * s}px`, backgroundSize: 'cover', backgroundPosition: 'top center', backgroundImage: src ? `url("${src}")` : 'none' }, screen);
  app.className = 'app';
  const foot = el('div', { position: 'absolute', left: '0', bottom: '0', width: `${sw}px`, height: `${SCREEN.bottom * s + 1}px`, background: colours.bottom }, screen);
  el('div', { position: 'absolute', left: '50%', bottom: `${8 * s}px`, width: `${140 * s}px`, height: `${5 * s}px`, marginLeft: `${-70 * s}px`, borderRadius: `${3 * s}px`, background: colours.bottomInk, opacity: '.85' }, foot);
  screen.insertAdjacentHTML('beforeend', statusBar(colours.topInk, s));
  // The Dynamic Island.
  el('div', { position: 'absolute', left: '50%', top: `${11 * s}px`, width: `${126 * s}px`, height: `${37 * s}px`, marginLeft: `${-63 * s}px`, borderRadius: `${19 * s}px`, background: '#000' }, screen);
  if (glare) {
    el('div', { position: 'absolute', inset: '0', borderRadius: `${sr}px`, background: 'linear-gradient(115deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,.04) 28%, rgba(255,255,255,0) 42%)', pointerEvents: 'none' }, screen);
  }
  // Side buttons, so it reads as a phone from an angle.
  const button = (top, len, side) => el('div', { position: 'absolute', top: `${top * h}px`, [side]: `${-w * 0.008}px`, width: `${w * 0.012}px`, height: `${len * h}px`, borderRadius: `${w * 0.006}px`, background: '#5a5a62', transform: `translateZ(${-T / 2}px)` }, root);
  button(0.2, 0.06, 'right'); button(0.17, 0.035, 'left'); button(0.24, 0.06, 'left'); button(0.31, 0.06, 'left');

  root.swap = (next) => { app.style.backgroundImage = `url("${next}")`; };
  root.app = app;
  root.screen = screen;
  root.dims = { w, h, s, sw, sh, bezel };
  return root;
}

// ---------------------------------------------------------------- cards

/** A thick, rounded game card standing in 3D, a word on its face. */
function card3d({ text = '?', bg = C.yellow, fg = C.ink, w = 360, h, x = 0, y = 0, rx = 0, ry = 0, rz = 0, z = 0, size, edge, font = 'Display' } = {}, parent) {
  h = h ?? w * 0.62;
  const T = w * 0.035;
  const r = w * 0.09;
  const root = el('div', { position: 'absolute', left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, transformStyle: 'preserve-3d', transform: `translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)` }, parent);
  const deep = edge ?? shade(bg, -0.22);
  for (let i = 6; i >= 1; i--) el('div', { position: 'absolute', inset: '0', borderRadius: `${r}px`, background: deep, transform: `translateZ(${(-T * i) / 6}px)` }, root);
  const face = el('div', { position: 'absolute', inset: '0', borderRadius: `${r}px`, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: `0 ${w * 0.07}px`, boxSizing: 'border-box', color: fg, font: `800 ${size ?? w * 0.13}px/1.02 ${font}`, letterSpacing: '-0.03em', boxShadow: `inset 0 ${w * 0.012}px 0 rgba(255,255,255,.35), inset 0 -${w * 0.01}px 0 rgba(0,0,0,.08)` }, root);
  face.innerHTML = text;
  root.face = face;
  return root;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v * amt : (255 - v) * amt))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function sticker({ emoji, size = 160, x = 0, y = 0, rot = 0, z = 0, ring = true } = {}, parent) {
  const n = el('div', { position: 'absolute', left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: ring ? '#fff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${size * 0.6}px`, lineHeight: '1', transform: `translateZ(${z}px) rotate(${rot}deg)`, boxShadow: ring ? `0 ${size * 0.08}px ${size * 0.12}px rgba(0,0,0,.22), inset 0 -${size * 0.04}px 0 rgba(0,0,0,.08)` : 'none', fontFamily: 'Emoji' }, parent);
  n.textContent = emoji;
  return n;
}

function pill({ text, bg = C.ink, fg = '#fff', size = 54, x = 0, y = 0, rot = 0, z = 0 } = {}, parent) {
  const n = el('div', { position: 'absolute', left: `${x}px`, top: `${y}px`, padding: `${size * 0.42}px ${size * 0.72}px`, borderRadius: `${size * 2}px`, background: bg, color: fg, font: `800 ${size}px/1 Display`, letterSpacing: '-0.02em', whiteSpace: 'nowrap', transform: `translateZ(${z}px) rotate(${rot}deg)`, boxShadow: `0 ${size * 0.18}px 0 ${shade(bg.startsWith('#') ? bg : '#000000', -0.35)}, 0 ${size * 0.4}px ${size * 0.5}px rgba(0,0,0,.25)` }, parent);
  n.innerHTML = text;
  return n;
}

/** Confetti: little ribbons scattered through space at fixed seeds. */
function confetti({ n = 60, seed = 7, x = 0, y = 0, w = 1320, h = 1200, colours = [C.yellow, C.pink, C.blue, C.green, C.purple, C.orange, '#fff'], size = 34, t = 0, fall = 0 } = {}, parent) {
  const rand = rng(seed);
  const pieces = [];
  for (let i = 0; i < n; i++) {
    const px = x + rand() * w; const py = y + rand() * h;
    const c = colours[Math.floor(rand() * colours.length)];
    const rot = rand() * 360; const tilt = rand() * 360; const sz = size * (0.6 + rand() * 0.8);
    const round = rand() < 0.3;
    const spin = (rand() - 0.5) * 720; const drift = (rand() - 0.5) * 120;
    const p = el('div', { position: 'absolute', left: `${px}px`, top: `${py}px`, width: `${round ? sz * 0.7 : sz}px`, height: `${round ? sz * 0.7 : sz * 0.42}px`, borderRadius: round ? '50%' : `${sz * 0.08}px`, background: c }, parent);
    p.base = { px, py, rot, tilt, spin, drift, sz };
    pieces.push(p);
  }
  const at = (time, fallPx = fall) => {
    for (const p of pieces) {
      const b = p.base;
      p.style.transform = `translate(${b.drift * Math.sin(time * 2 + b.rot)}px, ${fallPx * time}px) rotate(${b.rot + b.spin * time}deg) rotateX(${b.tilt + b.spin * time * 0.7}deg)`;
    }
  };
  at(t);
  pieces.at = at;
  return pieces;
}

function stage({ w, h, bg }) {
  document.body.style.margin = '0';
  document.body.style.background = '#000';
  const root = el('div', { position: 'relative', width: `${w}px`, height: `${h}px`, overflow: 'hidden', background: bg, perspective: `${Math.max(w, h) * 1.6}px` }, document.body);
  root.id = 'stage';
  const world = el('div', { position: 'absolute', inset: '0', transformStyle: 'preserve-3d' }, root);
  // Flat, over everything: labels that a tilted phone must never cut through.
  const front = el('div', { position: 'absolute', inset: '0' }, root);
  return { root, world, front };
}

/** Soft blobs and a grain-free glow, so a flat colour has some depth. */
function backdrop(world, { base, glow = 'rgba(255,255,255,.35)', blobs = [] }) {
  // Behind the 3D world, not in it, or tilted phones would slice through it.
  const parent = el('div', { position: 'absolute', inset: '0' });
  world.parentNode.insertBefore(parent, world);
  el('div', { position: 'absolute', inset: '0', background: base }, parent);
  el('div', { position: 'absolute', inset: '0', background: `radial-gradient(120% 70% at 50% 0%, ${glow}, transparent 60%)` }, parent);
  for (const b of blobs) el('div', { position: 'absolute', left: `${b.x}px`, top: `${b.y}px`, width: `${b.r * 2}px`, height: `${b.r * 2}px`, borderRadius: '50%', background: b.c, opacity: b.o ?? 0.5 }, parent);
}

function headline(parent, { kicker, title, sub, colour = C.ink, kickerColour, top = 150, size = 150, align = 'center', x = 90, w = 1140 }) {
  const box = el('div', { position: 'absolute', left: `${x}px`, top: `${top}px`, width: `${w}px`, textAlign: align, color: colour }, parent);
  if (kicker) el('div', { font: `800 46px/1 Text`, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '34px', color: kickerColour ?? colour, opacity: kickerColour ? '1' : '.7' }, box).textContent = kicker;
  el('div', { font: `800 ${size}px/0.95 Display`, letterSpacing: '-0.045em' }, box).innerHTML = title;
  if (sub) el('div', { font: `600 52px/1.3 Text`, marginTop: '40px', opacity: '.78', letterSpacing: '-0.01em' }, box).innerHTML = sub;
  return box;
}

// Store art is marketing, and Apple licenses its emoji for its own devices
// only. Fail rather than let the system fall back to Apple Color Emoji.
async function requireEmojiFont() {
  const faces = await document.fonts.load('40px Emoji', '\u{1F602}').catch(() => []);
  if (!faces.length) {
    document.title = 'error: Noto Color Emoji is not installed';
    throw new Error('Noto Color Emoji is not installed. Install it before rendering store art (see README.md).');
  }
}

Object.assign(window, { C, el, requireEmojiFont, rng, dex, dexSvg, phone, card3d, sticker, pill, confetti, stage, backdrop, headline, shade, SCREEN });
