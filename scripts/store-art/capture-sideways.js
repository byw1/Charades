// Captures the round held sideways, the way most people play: a card, the
// got-it flash and the pass flash, at 956 x 440 pt (3x), with the landscape
// iPhone safe areas emulated so the app lays itself out as on a device.
// Usage: node scripts/store-art/capture-sideways.js store/screens
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = process.env.APP_URL || 'http://localhost:8089/';
const out = process.argv[2];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 956, height: 440 }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, bottom: 21, left: 62, right: 62 } });
  const wait = (ms) => page.waitForTimeout(ms);
  const shot = (name) => page.screenshot({ path: `${out}/${name}.png` }).then(() => console.log('shot', name));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await wait(1500);
  await page.getByRole('button', { name: 'Skip' }).first().click();
  await wait(1500);
  await page.getByRole('button', { name: 'Play Mix it up' }).first().click();
  await wait(1200);
  await page.mouse.click(478, 220);
  await wait(3600);
  // Top half is got it, bottom half pass: the tap stand-in for a tilt.
  for (let i = 0; i < 4; i++) {
    await shot(`side-card-${i}`);
    const pass = i % 2 === 1;
    await page.mouse.click(478, pass ? 400 : 60);
    await wait(90);
    await shot(`side-flash-${i}-${pass ? 'pass' : 'got'}`);
    await wait(700);
  }
  await browser.close();
})();
