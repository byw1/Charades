// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/**
 * Non-negotiable 1: the app makes zero network calls. These are the ways code
 * reaches the internet from JavaScript; any of them fails the lint. A deck
 * travels by QR, file or link, all of which are on-device. See also
 * src/noNetwork.test.ts, which scans for the same things so the rule cannot
 * be quietly switched off with an eslint-disable comment.
 */
const offline = 'Deckhead is fully offline: no network calls. See SPEC.md, non-negotiable 1.';

const networkGlobals = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource'].map((name) => ({
  name,
  message: offline,
}));

const networkImports = [
  { name: 'axios', message: offline },
  { name: 'expo-updates', message: `${offline} Over-the-air updates call home.` },
  { name: 'expo-network', message: offline },
  { name: '@react-native-community/netinfo', message: offline },
];

const networkSyntax = ['downloadAsync', 'uploadAsync', 'createDownloadResumable', 'downloadFileAsync', 'sendBeacon'].map(
  (name) => ({
    selector: `MemberExpression[property.name='${name}']`,
    message: offline,
  }),
);

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'scripts/store-art/*'],
  },
  {
    // Build-time scripts run under Node, not in the app bundle.
    files: ['spec/**/*.js', '*.config.js'],
    languageOptions: {
      globals: { __dirname: 'readonly', require: 'readonly', module: 'writable' },
    },
  },
  {
    // SPEC hard rule: everything in /src/game is pure TypeScript. Scoring, round
    // resolution and win-condition evaluation must be unit-testable without a
    // renderer, so the boundary is enforced here rather than by discipline.
    files: ['src/game/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...networkImports,
            { name: 'react', message: '/src/game must stay pure TypeScript. No React.' },
            { name: 'react-native', message: '/src/game must stay pure TypeScript. No React Native.' },
            {
              name: 'zustand',
              // zustand/vanilla is pure, but the default entry pulls in React
              // via useSyncExternalStore. Stores live in /src/hooks.
              message: '/src/game holds rules, not state containers. Put the store in /src/hooks.',
            },
          ],
          patterns: [
            {
              group: ['react-native/*', 'react/*', 'expo', 'expo-*', '@expo/*', '@/ui/*', '@/hooks/*'],
              message: '/src/game must stay pure TypeScript. No React, React Native, Expo or UI imports.',
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', ...networkGlobals],
      'no-restricted-syntax': ['error', ...networkSyntax],
    },
  },
  {
    // The same offline rule for everything else in the app. Kept separate from
    // the /src/game block because flat config replaces a rule's options rather
    // than merging them, which would otherwise drop the purity rule above.
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    ignores: ['src/game/**'],
    rules: {
      'no-restricted-imports': ['error', { paths: networkImports }],
      'no-restricted-globals': ['error', ...networkGlobals],
      'no-restricted-syntax': ['error', ...networkSyntax],
    },
  },
]);
