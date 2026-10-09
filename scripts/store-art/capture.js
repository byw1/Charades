// Captures real app screens for the store art, from the web build on :8089.
// 440 pt wide at 3x, like a 6.9" iPhone. Run with VH=860 for the art: that is
// the screen less the status bar and home-indicator strips, which the phone
// mock-up in kit.js draws itself.
// Usage: VH=860 node scripts/store-art/capture.js store/screens [home,edit,round]
const { chromium } = require('playwright-core');
const out = process.argv[2];
const only = process.argv[3] || 'all';
const V = { width: 440, height: Number(process.env.VH || 956) };
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: V, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  const logs = [];
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`.slice(0, 300)));
  page.on('dialog', (d) => d.accept());
  const wait = (ms) => page.waitForTimeout(ms);
  const shot = async (name, ms = 700) => { await wait(ms); await page.screenshot({ path: `${out}/${name}.png` }); console.log('shot', name); };
  const btn = (name) => page.getByRole('button', { name }).first();
  const tab = (name) => page.getByLabel(name, { exact: true }).first();
  const step = async (label, fn) => { try { await fn(); } catch (e) { logs.push(`[step ${label}] ${e.message.split('\n')[0].slice(0, 200)}`); await page.screenshot({ path: `${out}/zz-${label}.png` }); } };
  const want = (k) => only === 'all' || only.split(',').includes(k);

  await page.goto('http://localhost:8089/', { waitUntil: 'networkidle' });
  await wait(1500);
  await shot('00-welcome', 300);
  await step('skip', async () => { await btn('Skip').click(); await wait(1500); });

  if (want('home')) {
    await step('play', async () => { await shot('01-play'); });
    await step('peek', async () => { await btn('Peek').click(); await shot('02-peek', 1500); await btn('Close preview').click(); await wait(800); });
    await step('decks', async () => { await tab('Decks').click(); await shot('03-decks', 1000); });
  }
  if (want('edit')) {
    await step('newdeck', async () => {
      await tab('Decks').click(); await wait(600);
      await btn('Make a deck').click(); await wait(1200);
      await page.getByLabel('Deck name').fill('Roommate Lore'); await wait(300);
      await page.getByLabel('Deck colour', { exact: false }).nth(1).click().catch(() => {}); await wait(200);
      const cards = ['The 3am fire alarm', 'Jake’s sourdough phase', 'Who ate my leftovers', 'Karaoke night', 'The couch we found', 'Mystery fridge smell', 'Group chat drama', 'Our landlord Steve', 'Taco Tuesday', 'The haunted closet', 'Spring break 2025', 'Roomba named Kevin'];
      for (const c of cards) { await page.getByLabel('New card text').fill(c); await page.keyboard.press('Enter'); await wait(120); }
      await page.evaluate(() => window.scrollTo(0, 0));
      await shot('04-editor', 900);
      await btn('Change the cover emoji').click(); await wait(1200);
      await shot('05-emoji');
      await page.getByLabel('Search: pizza, party, dog…').fill('house'); await wait(500);
      const use = page.getByRole('button', { name: /^Use / }).first();
      await use.click(); await wait(900);
      await shot('06-editor-emoji');
      await btn(/Save deck/).click(); await wait(1500);
      await shot('07-deck-saved');
      await page.goBack().catch(() => {}); await wait(800);
    });
  }
  if (want('round')) {
    await step('setup', async () => {
      await tab('Play').click(); await wait(800);
      await shot('08-play-again');
      await btn('Teams and rules').click(); await wait(1000);
      await shot('09-decks-pick');
      await btn('Next').click(); await wait(1000);
      await page.getByRole('radio', { name: /Teams/ }).click().catch(() => {}); await wait(400);
      const fields = page.getByLabel('Player names, one per line');
      await fields.nth(0).fill('Sam\nJo\nMaya').catch(() => {}); await fields.nth(1).fill('Alex\nKai\nPriya').catch(() => {});
      await shot('10-teams');
      await btn('Next').click(); await wait(1000);
      await shot('11-rules');
    });
    await step('round', async () => {
      await btn('Start game').click(); await wait(900);
      await shot('12-intro', 200);
      await page.mouse.click(220, 400); await wait(400);
      await shot('13-countdown', 0);
      await wait(3200);
      for (let i = 0; i < 8; i++) {
        await shot(`14-card-${i}`, 250);
        const pass = i === 2 || i === 5;
        await page.mouse.click(220, pass ? 760 : 200);
        await wait(90); await page.screenshot({ path: `${out}/15-flash-${i}-${pass ? 'pass' : 'got'}.png` });
        await wait(600);
      }
      await btn('Pause').click(); await shot('16-paused', 600);
      await btn('End round').click(); await shot('17-recap', 1500);
      await btn('Continue').click(); await shot('18-standings', 1500);
    });
  }
  console.log(logs.join('\n'));
  await browser.close();
})();
