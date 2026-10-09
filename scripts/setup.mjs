#!/usr/bin/env node
/**
 * One-time setup for putting Charades on your own iPhone or the App Store.
 *
 *   npm run setup
 *
 * Asks for an app ID (Apple needs one nobody else has used), writes it into
 * app.json, and tells you exactly what to run next. Safe to run again: it only
 * ever changes the two ID fields, and shows you the old value first.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';

const APP_JSON = new URL('../app.json', import.meta.url);
const PLACEHOLDER = 'com.charades.app';

const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

/** Reverse-domain, lowercase, letters/numbers/dots/hyphens, at least two parts. */
export function isValidAppId(id) {
  return /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/.test(id) && id.length <= 155;
}

function suggest(name) {
  const handle = (name || 'yourname').toLowerCase().replace(/[^a-z0-9]/g, '') || 'yourname';
  return `com.${handle}.charades`;
}

async function main() {
  const config = JSON.parse(readFileSync(APP_JSON, 'utf8'));
  const current = config.expo.ios.bundleIdentifier;

  console.log(`\n${bold('Charades setup')}\n`);
  console.log('Every app on the App Store needs its own ID, written backwards like a web address.');
  console.log(`It never shows to players. ${dim(`Currently: ${current}`)}\n`);

  // An async line iterator rather than readline's question(), which drops any
  // line that arrives before it is asked — a pasted answer, or piped input.
  const rl = createInterface({ input: stdin, terminal: false });
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (prompt) => {
    stdout.write(prompt);
    const { value, done } = await lines.next();
    if (done) throw new Error('Setup was cancelled before it finished. Nothing was changed.');
    return value;
  };

  const name = (await ask('Your name or company, one word (e.g. william): ')).trim();
  const fallback = current === PLACEHOLDER ? suggest(name) : current;

  let id = '';
  for (;;) {
    const answer = (await ask(`App ID ${dim(`[${fallback}]`)}: `)).trim().toLowerCase();
    id = answer || fallback;
    if (isValidAppId(id)) break;
    console.log('  That needs to look like com.yourname.charades — lowercase letters, numbers, dots.');
  }
  rl.close();

  config.expo.ios.bundleIdentifier = id;
  config.expo.android.package = id.replace(/-/g, '_');
  writeFileSync(APP_JSON, `${JSON.stringify(config, null, 2)}\n`);

  console.log(`\n${green('✓')} Saved ${bold(id)} to app.json\n`);
  console.log(bold('What next — pick one:'));
  console.log(`  ${bold('Just try it')}            npm start            ${dim('then scan the QR with the Expo Go app')}`);
  console.log(`  ${bold('Install it on my phone')} npm run phone:add    ${dim('once, to register your iPhone')}`);
  console.log(`                         npm run phone        ${dim('builds it and gives you an install link')}`);
  console.log(`  ${bold('Ship to the App Store')}  npm run store        ${dim('builds and uploads to TestFlight')}`);
  console.log(`                         npm run store:listing ${dim('uploads the description and keywords')}`);
  console.log(`\nFull walkthrough: ${bold('DEPLOY.md')}\n`);
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
