// Records the App Store app preview from the real app, frame by frame.
//
// The app runs in Chromium (the web build, served on :8089) with the iPhone
// safe areas emulated and its clock frozen; each frame moves time on by 1/30 s
// and takes a picture, so every animation is the app's own, at full frame rate.
// Captions and the closing title are laid over the top. Writes JPEG frames and
// a list of sound cues; make-videos.js turns them into the .mp4.
//
// Usage: node scripts/store-art/record-preview.js <frames dir>
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = process.env.APP_URL || 'http://localhost:8089/';
const FPS = 30;
const out = process.argv[2];

(async () => {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  // 443 x 960 pt at 2x is exactly Apple's 886 x 1920 preview size.
  const ctx = await browser.newContext({ viewport: { width: 443, height: 960 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  page.on('dialog', (d) => d.accept());
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 62, bottom: 34, left: 0, right: 0 } });
  await page.clock.install();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Skip' }).first().click();
  await page.waitForTimeout(1500);
  await page.addScriptTag({ path: path.join(__dirname, 'kit.js') });
  await page.evaluate(installOverlay);
  await page.clock.pauseAt(Date.now() + 500);

  let frame = 0;
  const cues = [];
  const cue = (name) => cues.push({ name, at: frame / FPS });
  const caption = (text, where = 'bottom') => page.evaluate(([t, w]) => window.__caption(t, w), [text, where]);
  /** Records `seconds` of the app as it is. */
  const rec = async (seconds, each) => {
    const n = Math.round(seconds * FPS);
    for (let i = 0; i < n; i++) {
      await page.clock.runFor(1000 / FPS);
      if (each) await each(i / FPS);
      await page.evaluate(() => window.__tick());
      await page.screenshot({ path: path.join(out, `f${String(frame).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 93 });
      frame++;
    }
  };
  /** Lets time pass without recording (behind a cut). */
  const skip = (ms) => page.clock.runFor(ms);
  const btn = (name) => page.getByRole('button', { name }).first();

  // 1. Pick a deck.
  await caption('Pick a deck. Any deck.', 'top');
  await rec(2.2);
  await btn('Play Mix it up').click();
  cue('go');
  await caption('');
  await rec(0.6);
  // 2. Who's up.
  await caption('No peeking!', 'bottom');
  await rec(1.6);
  await page.mouse.click(220, 480);
  await rec(2.2);
  await caption('');
  await rec(1.2);
  // 3. Cards. Top half is got it, bottom half is pass, standing in for a tilt.
  const plays = ['got', 'got', 'pass', 'got', 'got', 'pass', 'got'];
  for (const [i, kind] of plays.entries()) {
    const first = i === 0 || (kind === 'pass' && i === 2);
    await caption(kind === 'got' ? (i === 0 ? 'Tip down: got it!' : '') : i === 2 ? 'Tip up: pass' : '', 'bottom');
    await rec(first ? 1.1 : 0.75);
    await page.mouse.click(220, kind === 'got' ? 300 : 800);
    cue(kind === 'got' ? 'correct' : 'pass');
    await rec(0.55);
  }
  await caption('');
  // 4. Results.
  await btn('Pause').click();
  await skip(500);
  await btn('End round').click();
  cue('win');
  await skip(250);
  await caption('Every round, scored', 'bottom');
  await rec(2.6);
  await btn('Continue').click();
  await skip(600);
  await caption('');
  await rec(1.3);
  // 5. Make a deck.
  await btn('Finish later').click();
  await skip(900);
  await page.getByLabel('Decks', { exact: true }).first().click();
  await skip(700);
  await btn('Make a deck').click();
  await skip(900);
  await caption('Make your own decks', 'bottom');
  await page.getByLabel('Deck name').click();
  for (const ch of 'Roommate Lore') { await page.keyboard.type(ch); await rec(1 / FPS * 2); }
  const field = page.getByLabel('New card text');
  for (const c of ['Roomba named Kevin', 'The 3am fire alarm', 'Our landlord Steve']) {
    await field.click();
    for (const ch of c) { await page.keyboard.type(ch); await rec(1 / FPS); }
    await page.keyboard.press('Enter');
    cue('tick');
    await rec(0.35);
  }
  await rec(0.6);
  // 6. Title.
  await caption('');
  cue('win');
  await rec(2.8, (t) => page.evaluate((tt) => window.__slate(tt), t));

  fs.writeFileSync(path.join(out, 'cues.json'), JSON.stringify({ fps: FPS, frames: frame, cues }, null, 2));
  console.log(`recorded ${frame} frames, ${(frame / FPS).toFixed(1)} s`);
  await browser.close();
})();

/** Runs in the page: status bar, captions and the closing title, over the app. */
function installOverlay() {
  const css = document.createElement('style');
  css.textContent = `
    #ovl { position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; font-family: BricolageGrotesque_800ExtraBold, sans-serif; }
    #ovl .bar { position: absolute; left: 0; right: 0; top: 0; height: 54px; display: flex; align-items: center; justify-content: space-between; padding: 6px 30px 0 46px; box-sizing: border-box; font: 600 17px/1 PlusJakartaSans_700Bold, sans-serif; }
    #ovl .cap { position: absolute; left: 50%; transform: translate(-50%, 0) scale(1); padding: 16px 26px; border-radius: 40px; background: #fff; color: #0A0A0D; font-size: 30px; letter-spacing: -0.03em; white-space: nowrap; box-shadow: 0 6px 0 rgba(0,0,0,.18), 0 14px 30px rgba(0,0,0,.25); opacity: 0; }
    #ovl .slate { position: absolute; inset: 0; background: #9B5CFF; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; opacity: 0; }
    #ovl .slate .dexs { width: 230px; height: 230px; }
    #ovl .slate h1 { margin: 26px 0 0; font-size: 92px; line-height: .9; letter-spacing: -0.05em; }
    #ovl .slate h2 { margin: 12px 0 0; font-size: 38px; letter-spacing: -0.03em; color: #FFE500; }
    #ovl .slate p { margin: 34px 0 0; font: 700 22px/1.3 PlusJakartaSans_700Bold, sans-serif; opacity: .85; }
  `;
  document.head.appendChild(css);
  const o = document.createElement('div');
  o.id = 'ovl';
  o.innerHTML = `<div class="bar"><span>9:41</span><span class="icons"></span></div><div class="cap"></div>
    <div class="slate"><div class="dexs">${window.dexSvg('excited')}</div><h1>Charades</h1><h2>Make Your Own Decks</h2><p>Plays fully offline</p></div>`;
  document.body.appendChild(o);
  const bar = o.querySelector('.bar');
  const cap = o.querySelector('.cap');
  const slate = o.querySelector('.slate');
  const icons = (ink) => `<svg width="18" height="12" viewBox="0 0 18 12" fill="${ink}"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
    <svg width="16" height="12" viewBox="0 0 16 12" fill="${ink}" style="margin-left:6px"><path d="M8 2.6c2.4 0 4.6.9 6.2 2.5l1.1-1.2A10.4 10.4 0 0 0 8 1 10.4 10.4 0 0 0 .7 3.9l1.1 1.2A8.8 8.8 0 0 1 8 2.6Zm0 3.4c1.5 0 2.9.6 4 1.6l1.1-1.2A7.3 7.3 0 0 0 8 4.4c-2 0-3.8.8-5.1 2l1.1 1.2c1.1-1 2.5-1.6 4-1.6Zm0 3.3c.7 0 1.3.3 1.8.7L8 11.9 6.2 10c.5-.4 1.1-.7 1.8-.7Z"/></svg>
    <svg width="27" height="13" viewBox="0 0 27 13" style="margin-left:6px"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="${ink}" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.5" fill="${ink}"/><path d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2Z" fill="${ink}" opacity=".45"/></svg>`;
  bar.querySelector('.icons').style.display = 'flex';

  let capAge = 0;
  window.__caption = (text, where) => {
    if (text === cap.textContent && text) return;
    cap.textContent = text;
    cap.style.top = where === 'top' ? '78px' : '';
    cap.style.bottom = where === 'top' ? '' : '120px';
    capAge = 0;
  };
  /** Each frame: colour the status bar to suit what is under it; ease captions in. */
  window.__tick = () => {
    const under = document.elementsFromPoint(220, 20).find((n) => !o.contains(n) && getComputedStyle(n).backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(getComputedStyle(n).backgroundColor));
    const m = under ? getComputedStyle(under).backgroundColor.match(/\d+/g) : [10, 10, 13];
    const ink = 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2] > 150 ? '#000' : '#fff';
    if (bar.dataset.ink !== ink) { bar.dataset.ink = ink; bar.style.color = ink; bar.querySelector('.icons').innerHTML = icons(ink); }
    capAge++;
    const k = Math.min(1, capAge / 7);
    const pop = k < 1 ? 0.7 + 0.42 * Math.sin((k * Math.PI) / 1.6) : 1;
    cap.style.opacity = cap.textContent ? String(Math.min(1, capAge / 4)) : '0';
    cap.style.transform = `translate(-50%, 0) scale(${pop}) rotate(${(1 - k) * -4}deg)`;
  };
  window.__slate = (t) => {
    const k = Math.min(1, t / 0.35);
    slate.style.opacity = String(k);
    const d = slate.querySelector('.dexs');
    const b = Math.min(1, t / 0.6);
    d.style.transform = `translateY(${(1 - b) * 120 - Math.abs(Math.sin(t * 5)) * 18}px) scale(${0.6 + 0.4 * b}) rotate(${Math.sin(t * 4) * 6}deg)`;
    slate.querySelector('h1').style.transform = `scale(${0.8 + 0.2 * Math.min(1, t / 0.5)})`;
  };
}
