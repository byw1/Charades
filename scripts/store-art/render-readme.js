// Renders the README artwork into docs/images/: the banner, the phone fan,
// a strip of the App Store screenshots and a short gameplay GIF.
// Needs the screens in store/screens, the screenshots in store/out, and the
// preview video (see README.md here), plus playwright-core and ffmpeg.
// Usage: node scripts/store-art/render-readme.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const ROOT = path.join(__dirname, '..', '..');
const out = path.join(ROOT, 'docs', 'images');
const shots = path.join(ROOT, 'store', 'out', 'screenshots');
const preview = path.join(ROOT, 'store', 'out', 'preview', 'app-preview-886x1920.mp4');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files'] });

  for (const [name, w, h] of [['banner', 1280, 640], ['phones', 1600, 820]]) {
    const tab = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1.5 });
    await tab.goto(`file://${path.join(__dirname, 'readme.html')}?n=${name}`);
    await tab.waitForFunction(() => document.title === 'ready');
    await tab.locator('#stage').screenshot({ path: path.join(out, `${name}.jpg`), type: 'jpeg', quality: 88 });
    await tab.close();
    console.log('wrote', `docs/images/${name}.jpg`);
  }

  // The seven App Store screenshots side by side.
  const files = fs.readdirSync(shots).filter((f) => f.endsWith('.png')).sort();
  const tab = await browser.newPage({ viewport: { width: 100, height: 100 }, deviceScaleFactor: 1 });
  const imgs = files.map((f) => `<img src="data:image/png;base64,${fs.readFileSync(path.join(shots, f)).toString('base64')}">`).join('');
  await tab.setContent(`<style>body{margin:0}#s{display:inline-flex;gap:24px;padding:24px;background:#0A0A0D}img{height:620px;border-radius:26px}</style><div id="s">${imgs}</div>`);
  await tab.waitForTimeout(500);
  await tab.locator('#s').screenshot({ path: path.join(out, 'screenshots.jpg'), type: 'jpeg', quality: 86 });
  console.log('wrote docs/images/screenshots.jpg');
  await browser.close();

  // Eight seconds of real play from the App Store preview, as a looping GIF.
  if (fs.existsSync(preview)) {
    const gif = path.join(out, 'gameplay.gif');
    const filters = 'fps=12,scale=300:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4';
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-ss', '7.4', '-t', '8.2', '-i', preview, '-filter_complex', filters, '-loop', '0', gif]);
    console.log('wrote docs/images/gameplay.gif');
  }
})();
