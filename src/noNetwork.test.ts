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

/**
 * The same guarantee one level up. Clean source is not enough if the build
 * itself reaches out: an over-the-air update check on launch, a build that
 * loads its code from a computer, or an SDK that phones home on its own.
 */
describe('offline guarantee: how the app is built', () => {
  const json = (file: string) => JSON.parse(readFileSync(join(ROOT, file), 'utf8')) as Record<string, unknown>;
  const pkg = json('package.json') as { dependencies: Record<string, string>; devDependencies?: Record<string, string> };
  const expo = (json('app.json') as { expo: Record<string, unknown> }).expo;
  const eas = json('eas.json') as { build: Record<string, Record<string, unknown>> };

  it('ships no package that talks to the internet by itself', () => {
    const shipped = Object.keys(pkg.dependencies);
    const banned = [
      /^expo-updates$/, // checks for new code on every launch
      /^expo-dev-client$/, // loads the app's code from a computer
      /^expo-network$/,
      /^@react-native-community\/netinfo$/,
      /^axios$/,
      /sentry|firebase|amplitude|segment|mixpanel|bugsnag|posthog|datadog|appsflyer|branch|onesignal/i,
    ];
    expect(shipped.filter((name) => banned.some((b) => b.test(name)))).toEqual([]);
  });

  it('has no over-the-air update address', () => {
    const updates = expo.updates as { url?: string; enabled?: boolean } | undefined;
    expect(updates?.url).toBeUndefined();
  });

  it('builds phones a standalone app, never one that needs a computer', () => {
    for (const [name, profile] of Object.entries(eas.build)) {
      expect([name, profile.developmentClient ?? false]).toEqual([name, false]);
      expect([name, profile.channel ?? null]).toEqual([name, null]);
    }
  });

  it('never asks for the microphone', () => {
    const config = JSON.stringify(expo);
    expect(config).not.toMatch(/speech|NSMicrophoneUsageDescription/i);
    for (const plugin of expo.plugins as unknown[]) {
      if (Array.isArray(plugin)) expect([plugin[0], (plugin[1] as { microphonePermission?: unknown }).microphonePermission ?? false]).toEqual([plugin[0], false]);
    }
  });

  it('bundles every deck with nothing to download', () => {
    const decks = readdirSync(join(ROOT, 'assets/decks')).filter((f) => f.endsWith('.json'));
    expect(decks.length).toBeGreaterThan(0);
    for (const file of decks) {
      const text = readFileSync(join(ROOT, 'assets/decks', file), 'utf8');
      expect([file, /https?:\/\//.test(text)]).toEqual([file, false]);
    }
  });
});
