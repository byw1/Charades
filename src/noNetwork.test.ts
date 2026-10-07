import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Non-negotiable 1, enforced: the app makes zero network calls.
 *
 * The lint rule catches these as they are written. This scans the source as
 * plain text as well, so the rule cannot be switched off with an
 * eslint-disable comment and slip through review. Tests are excluded: they
 * may mention the banned names, as this one does.
 */

const ROOT = join(__dirname, '..');
const SOURCE_DIRS = ['app', 'src'];

const BANNED: { pattern: RegExp; why: string }[] = [
  { pattern: /\bfetch\s*\(/, why: 'fetch()' },
  { pattern: /\bnew\s+XMLHttpRequest\b/, why: 'XMLHttpRequest' },
  { pattern: /\bnew\s+WebSocket\b/, why: 'WebSocket' },
  { pattern: /\bnew\s+EventSource\b/, why: 'EventSource' },
  { pattern: /\bsendBeacon\b/, why: 'navigator.sendBeacon' },
  { pattern: /\.(downloadAsync|uploadAsync|createDownloadResumable|downloadFileAsync)\b/, why: 'file download/upload' },
  { pattern: /from\s+['"](axios|expo-updates|expo-network|@react-native-community\/netinfo)['"]/, why: 'network library' },
  { pattern: /https?:\/\/(?!localhost)[^\s'"`)]+/, why: 'hard-coded web address' },
];

/** Web addresses that may appear in source because they are never requested. */
const ALLOWED_URLS = [/github\.com\/byw1\/Deckhead/, /developer\.apple\.com/, /react\.dev/, /docs\.expo\.dev/];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('offline guarantee', () => {
  const files = SOURCE_DIRS.flatMap((dir) => sourceFiles(join(ROOT, dir)));

  it('finds the source it is meant to be checking', () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it('has no network calls anywhere in the app', () => {
    const offences: string[] = [];

    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        for (const { pattern, why } of BANNED) {
          const match = pattern.exec(line);
          if (!match) continue;
          if (why === 'hard-coded web address' && ALLOWED_URLS.some((ok) => ok.test(match[0]))) continue;
          offences.push(`${relative(ROOT, file)}:${index + 1} — ${why}: ${line.trim()}`);
        }
      });
    }

    expect(offences).toEqual([]);
  });
});
