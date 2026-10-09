// Renders shots.html into store/out/screenshots/*.png (1320 x 2868).
// Usage: node scripts/store-art/render-shots.js [panel numbers...]
// Needs playwright-core and a Chromium (see store/README.md).
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const page = path.join(__dirname, 'shots.html');
const out = path.join(__dirname, '..', '..', 'store', 'out', 'screenshots');
const which = process.argv.slice(2).map(Number);
const panels = which.length ? which : [1, 2, 3, 4, 5, 6, 7];

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const tab = await browser.newPage({ viewport: { width: 1320, height: 2868 }, deviceScaleFactor: 1 });
  tab.on('pageerror', (e) => console.error('pageerror', e.message));
  for (const n of panels) {
    await tab.goto(`file://${page}?n=${n}`);
    await tab.waitForFunction(() => document.title === 'ready', null, { timeout: 30000 });
    const file = path.join(out, `${String(n).padStart(2, '0')}.png`);
    await tab.locator('#stage').screenshot({ path: file });
    console.log('wrote', path.relative(process.cwd(), file));
  }
  await browser.close();
})();
