// Steps scripts/store-art/promo.html through time and saves every frame, plus its
// sound cues, for make-video.js.
// Usage: node scripts/store-art/record-promo.js <frames dir> [first second] [last second]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const FPS = 30;
const [out, fromArg, toArg] = process.argv.slice(2);

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto(`file://${path.join(__dirname, 'promo.html')}`);
  await page.waitForFunction(() => document.title === 'ready');
  const { duration, cues } = await page.evaluate(() => ({ duration: window.DURATION, cues: window.CUES }));
  const frames = Math.round(duration * FPS);
  const from = fromArg ? Math.round(Number(fromArg) * FPS) : 0;
  const to = toArg ? Math.round(Number(toArg) * FPS) : frames;
  const stage = page.locator('#stage');
  for (let i = from; i < to; i++) {
    await page.evaluate((t) => window.render(t), i / FPS);
    await stage.screenshot({ path: path.join(out, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 93 });
    if (i % 60 === 0) console.log('frame', i, '/', frames);
  }
  fs.writeFileSync(path.join(out, 'cues.json'), JSON.stringify({ fps: FPS, frames, cues }, null, 2));
  await browser.close();
})();
