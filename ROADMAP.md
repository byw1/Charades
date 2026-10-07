# Roadmap

Build order is defined in [SPEC.md](./SPEC.md). Each milestone ends green and
committed, with a check-in before the next one starts.

| Milestone | Scope | Status |
|---|---|---|
| M1 | Scaffold: Router, design tokens, deck schema, SQLite + migrations, five starter decks, deck browser and detail | Complete |
| M2 | The round: card drawer, timer, tap input, haptics, state flashes, countdown, recap | Complete |
| M3 | Sessions: teams, rotation, multi-round loop, win conditions, standings, resume | Complete |
| M4 | Custom decks: editor, bulk paste, duplicate, delete, reordering | Complete |
| M5 | Sharing: export, QR, file import, deep links, preview and collision handling | Complete |
| M6 | Polish: tilt mode, settings, accessibility, backgrounding, empty and error states | In progress |
| M7 | Ship: EAS config, icons and splash, screenshots, privacy manifest, TestFlight | In progress |

## Not in v1

Deliberately excluded. Listed here so the decisions stay visible rather than
being rediscovered as gaps.

- **AI deck generation** — needs a server, which breaks the fully-offline rule.
- **Second-device / companion-phone mode** — same reason.
- **Apple Watch app** — a separate target and a separate input model.
- **Localization beyond English** — deck content is language-tagged, so the data
  model is ready, but no translated UI ships in v1.
- **Community deck repository** — needs hosting and moderation.
- **Video recording of the guesser** — camera is scoped to QR import only.
- **Any monetization** — all content is free from install, no IAP.

## Deferred to a later milestone

Decisions made during M1 that need revisiting when the milestone that depends on
them arrives.

- **react-native-mmkv is not used.** v4 is a Nitro module and does not run in
  Expo Go, which would force a development build for every review. Settings now
  use `expo-sqlite/kv-store` instead — the same synchronous key-value role with
  no extra native dependency. Revisit only if a profile shows kv-store is too
  slow for session autosave in M3.
- **Card id regeneration on duplicate — done.** Duplicating a deck mints fresh
  card ids, so a copy and its original cannot mark each other's cards as seen.
  See `duplicateDeck` in `src/decks/edit.ts`. Import-as-copy in M5 must use the
  same function.
- **base64url for deep links — done.** The export payload is base64url. Standard
  base64 still decodes on the way in, so a payload pasted from elsewhere works.
- **Universal links need a domain.** The `deckhead://` scheme works now. The
  https equivalent needs a domain with an apple-app-site-association file, which
  is an M7 task and the one part of sharing that is not fully offline.
- **Custom deck empty state — done.** The browser now always shows a "Yours"
  section, with an invitation when it is empty and a New deck button below it.
- **Accent colour and the state flash — done.** The editor now offers only
  colours from `deckColors`, which leaves out green and orange, the correct and
  pass flashes. An imported deck can still be any colour; the flash's word and
  icon keep it readable. See the Redesign section of `spec/decisions.md`.
- **Reduced motion — done.** Every decorative animation checks
  `useReducedMotion` and stands still when the phone asks it to.
- **The tilt axis sign needs a real device.** Tilt is built and unit-tested, but
  which way "down" reads on the accelerometer's z axis cannot be confirmed in a
  simulator. It is isolated in `TILT_DOWN_SIGN` in `src/game/tilt.ts`; if a
  device answers backwards, that constant is the whole fix. Check it before the
  M7 TestFlight build.
- **Sound has a setting but no sound.** `Settings.sound` persists and the
  settings screen deliberately does not show it, because nothing plays audio
  yet. The toggle ships with the audio it governs, not before.
- **What is left for M7.** Config, icons, splash, privacy manifest and policy,
  and the App Store listing are in the repo. What remains needs a person and an
  Apple account: screenshots from a real phone, a TestFlight pass, and the
  submit button. DEPLOY.md walks through each.
