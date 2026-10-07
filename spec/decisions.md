# Decisions

Choices made while building that the spec did not settle, and the reasoning
behind them. Supporting doc to [SPEC.md](../SPEC.md).

## M1

### Card ids must be regenerated on duplicate and import-as-copy

The spec says a card `id` is stable and never regenerated on edit, because
seen-card tracking depends on it. That is right, but it leaves a gap: duplicating
a deck, or importing a deck as a copy after an id collision, produces two decks
whose cards share ids.

`Session.seenCardIds` is a flat list of card ids across a multi-deck pool. If a
session includes both the original and the copy, marking a card seen in one
silently marks it seen in the other, and the round quietly skips cards it should
have drawn.

Duplicating is not editing, so minting fresh card ids on copy does not violate
the stability rule. Storage additionally keys seen-tracking as `deckId/cardId`
so the invariant holds even if a malformed deck arrives by import. The public
`Session.seenCardIds: string[]` shape from the spec is unchanged; the strings
are composite keys.

### Storage is normalised, not a JSON blob per deck

Decks could be stored as one JSON document per row. They are stored as `decks`
plus `cards` instead, because the deck browser needs card counts for every deck
at once, search needs to match card text, and M4 needs per-card reordering. All
three are one query against a normalised schema and a full table scan plus parse
against blobs.

The JSON shape in the spec remains the interchange format for import and export.
It is not the storage format.

### Bundled decks live in the same tables as custom decks

A `source` column marks a deck as `bundled` or `custom`. Bundled decks are not
special-cased anywhere downstream: counts, search, deck selection and sessions
treat them identically. The only difference is that bundled decks are read-only
until M4 offers duplicate-to-edit, and that seeding re-applies them when their
`updatedAt` moves forward in an app update.

This keeps the "nothing the user creates can be lost" rule simple to honour.
Re-seeding only ever touches rows marked `bundled`, so a custom deck cannot be
overwritten by an update.

### iPad is not supported

`supportsTablet` is false. The game is a phone held against a forehead, and
per-screen orientation locking on iPad requires `requireFullScreen`, which is an
extra constraint to carry for a form factor nobody will use this way. The app
runs on iPad in iPhone compatibility mode.

### No validation library

The deck validator is hand-written rather than using zod or similar. The rules
are a short list of shape and range checks, they need to produce import error
messages aimed at a person rather than a developer, and the validator runs
against untrusted input from QR codes and files in M5. A dependency-free
validator keeps the import path auditable and the dependency tree small.

### Anton for card text

_Superseded: Bricolage Grotesque for cards and display, Plus Jakarta Sans for UI._

The spec asks for a heavy condensed grotesque for card text and a separate
neutral face for UI. Card text uses Anton, which is free under the SIL Open Font
License, genuinely condensed, and available as a single heavy weight — which is
all the card needs. UI uses the system font, which costs nothing to load and
inherits Dynamic Type support for the accessibility pass in M6.

Both are referenced through design tokens, so swapping either is a one-line
change.

## M3

### Sessions are a JSON document, decks are normalised

Opposite choices for opposite access patterns. A deck is queried across — card
counts for every deck at once, search over card text, per-card reordering — so
it is normalised into tables. A session is only ever read whole and written
whole, and splitting teams, rounds and results apart would mean four joins to
reassemble a few kilobytes of JSON.

Because a session round-trips through JSON, every read is parsed and proved
rather than cast, and a round containing one malformed result rejects the whole
round. A partial recovery would silently change a score.

### Rotation is derived, not stored

Whose turn it is comes from the round count modulo the team count, not from a
stored pointer. Same reasoning as score: a stored pointer is a second source of
truth that can drift out of step with the round list. The one piece that is
stored is `nextPlayerIndex` per team, because which player within a team is up
cannot be derived from a round count alone once teams play different numbers of
rounds.

### An interrupted round is discarded, not scored

Sessions are written at round completion, never at round start. If the app dies
mid-round, that round is absent from the stored session and the team takes its
turn again from the top.

The alternative — saving continuously and resuming mid-round — means restoring a
running timer, which is both harder and worse: nobody wants to come back to a
game with eleven seconds left on a round they have lost the thread of. Because
the cards a dropped round showed were never folded into `seenCardIds`, they
return to the pool with no rollback needed.

### Standings and final standings are one screen

The difference between them is what the game asks you to do next, not what it
shows you. The table stays put and only the footer changes, so the score does
not appear to jump between two differently-laid-out screens at the moment
people care about it most.

### Just play is the default, and it is a team underneath

The team path is opt-in. Plenty of groups do not want teams, and making them
configure some before playing is the friction that gets a party app deleted.
Underneath, "just play" is a single team named Everyone, so scoring, rotation
and win conditions all have exactly one code path.

## M4

### Bundled decks are read-only, and duplicate-to-edit is the way in

A bundled deck cannot be edited or deleted. Making them editable would mean
either abandoning re-seeding — so content fixes never reach existing installs —
or letting an app update overwrite someone's changes. Neither is acceptable
against the rule that nothing the user creates can be lost.

Duplicating gives an editable copy with fresh ids, and the deck detail screen
says why in one line rather than presenting a disabled Edit button.

### Reordering is up and down, not drag

Explicit buttons rather than a drag handle. Dragging needs gesture handler and
reanimated wired into a list, is fiddly with the keyboard open, and is close to
unusable under VoiceOver. Up and down are boring, reliable, and each one is a
labelled control a screen reader can announce. Worth revisiting in M6 if
reordering long decks turns out to be common, which is doubtful — most decks
are pasted in the order people already wanted.

### Bulk paste splits on newlines only

One card per line, with an optional hint after a pipe. Commas and dashes stay
literal: "Earth, Wind & Fire" and "Spider-Man" are real card text, and treating
either as a separator would quietly mangle exactly the sort of content people
paste. The pipe is rare enough in card text to be safe and is the only way to
get notes in without a second editing pass.

Duplicates are reported rather than silently added or silently dropped — pasting
a list twice is a common accident, and the count tells you it happened.

## M5

### The QR limit is 2.1KB, not the spec's 1.5KB

The spec pairs a 1.5KB payload ceiling with a target of "most decks under ~150
cards". Measured, those two do not agree. Card ids are random hex and do not
compress, so every card costs about 11 bytes of payload whatever its text, and
1.5KB runs out at 105 cards.

The constraint behind 1.5KB also does not apply here. That figure protects
legibility at distance, which is the card face's problem — a QR is scanned phone
to phone at arm's length off a bright screen. At low error correction a version
40 code holds about 2953 bytes, so 2.1KB lands near version 34 with real margin
and delivers the ~150 cards the spec actually asked for.

Low error correction for the same reason: the usual argument for higher levels
is print damage, and this code lives on a screen for ten seconds. Spending
capacity on recovery would mean a denser code for the same deck.

### The payload carries its own version, separate from schemaVersion

`D1.` prefixes every payload. The deck's `schemaVersion` answers "can this build
read this deck"; the payload version answers "can this build read this
envelope". A future change to compression or encoding must not be mistaken for a
change to the deck shape, and vice versa.

### Import is never silent, including from a deep link

A payload from a QR, a file, a paste or a `deckhead://` link all land on the
same preview with a confirm tap. A link is content someone else controls, so it
gets no more trust than a pasted string.

### Keeping both on a collision goes through duplicateDeck

Saving an imported deck alongside one with the same id mints a fresh deck id and
fresh card ids, using the same function as M4's duplicate. Keeping the card ids
would make the two decks mark each other's cards as seen in a session holding
both.

## M6

### Tilt replaces tap rather than joining it

Turning tilt on removes the tap targets for the round. Keeping both sounds
safer and is not: the phone is pressed against skin for the whole round, and
the tap targets are half the screen each, so a stray palm would resolve cards
nobody guessed. A mode is a mode.

The exception is a device with no accelerometer, where `useTilt` reports
unavailable and tap stays. Choosing tilt can never leave a round with no way to
answer.

### The tilt gesture is guarded three ways, not one

The spec's brief for tilt is a threshold plus a return to neutral, because the
incumbent's unreliable gyro controls are the complaint the product is aimed at.
A threshold alone is not enough — an excited jerk crosses any angle you care to
name. `src/game/tilt.ts` adds two more guards:

- **A dwell.** The tilt must hold past the trigger for 120ms. A swing through
  the angle does not resolve anything.
- **A motion gate.** Samples whose magnitude strays more than 0.35g from 1g are
  the phone being moved rather than held at an angle, and are dropped. Gravity
  alone reads 1g; a jerk does not.

A jerk fails both. Deliberately tipping the phone and holding it fails neither.

The machine is pure and starts disarmed, so the trip up to a forehead — which
passes through every angle — resolves nothing until the phone has been seen
near upright once.

### The screen-normal sign is the one line that needs a device

Which way "down" reads on the accelerometer's z axis is a platform convention,
and it is the only part of tilt that cannot be settled without hardware. It is
isolated in `TILT_DOWN_SIGN` with the reasoning written out: on iOS a device
lying screen-up reads z = -1, so a screen tipped toward the floor reads +1. If
a real device ever reads inverted, that constant is the whole fix. Everything
either side of it is unit-tested.

### No sound toggle until there is sound

The spec asks for a sound setting, off by default, with a line explaining why.
The setting exists in `useSettings` and the settings screen does not show it,
because nothing in the app plays audio yet — the control would be a switch
wired to nothing, which is worse than no control. It ships with the sound it
governs.

### Input mode is an app setting, stamped into the session

Round length, win condition and pass penalty are chosen per game. Input mode is
not: it is a fact about the person holding the phone, and asking again every
game is friction for a preference that never changes. It lives in app settings
and the new game flow stamps the current value into `Session.settings.inputMode`
at start, so a stored session still records what it was actually played with.

## Redesign

_Superseded by the Snapchat-style redesign below. Kept for the reasoning that
carried over: text fitting, deck colours avoiding the flash colours, reduced
motion, and the mascot._

A ground-up visual redesign, asked for by the product owner: bright, clean and
fun, in the spirit of Duolingo. The game engine, storage, sharing and tilt are
untouched; everything the player sees is new. This supersedes the spec's
original design direction — a near-black canvas, a condensed face for cards
and a neutral one for UI, no exclamation marks in chrome.

### Light, chunky and pressable

A white canvas, saturated colour used with intent, and every pressable surface
sitting on a solid ledge of its own darker shade that it visibly presses into,
with a light haptic on touch-down. The ledge is a separate layer under the face
rather than a bottom border, so a press moves the face without shifting the
layout around it.

The legibility brief survives the change of mood. Every colour that carries
white text clears 3:1 against white, which is WCAG AA for the large, heavy type
it is always paired with; `cardTextOn` prefers white on a deck colour only when
it clears that bar, and falls back to dark text on pale colours like yellow.

### One typeface: Nunito

Rounded terminals and heavy weights that stay friendly at any size. One family
for menus and cards keeps the app sounding like one voice; weight does the work
of hierarchy. Card text is now mixed case rather than uppercase — mixed case is
faster to read at a glance, and the rounded face is what carries the volume.

### Dex

A mascot gives a party app a personality to hang copy on. Dex is a round head
with a card stuck to its forehead — the game explained in one picture. Dex asks
the questions in setup, reacts to how a round went, sleeps on the pause screen
and celebrates the end of a game.

Drawn in SVG rather than shipped as images, so moods are a prop, it is sharp
at every size, and it costs nothing in bundle size. It bobs and blinks unless
the phone has reduced motion on, in which case every decorative animation in
the app stands still. The flashes stay, because they carry information.

### Copy can be excited now

"Got it!", "Nice one!", "Time's up!". The old rule against exclamation marks
suited a quiet, dark interface; it fights a cheerful one. Instructions stay
plain — exclamation marks are for reactions, not for buttons.

### The flash pops rather than blinks

The full-screen flash now shows an icon and a word that spring in, and stays
for 420ms instead of 250ms so the word can be read before it goes. It is still
the signature moment of the round and still fills the whole screen.

### Card text is sized up front

The platform's shrink-to-fit was carrying the whole job of fitting a card to
the screen. It behaves differently per platform and cannot balance a title
across lines, and rendering every screen during the redesign showed long titles
overflowing where it is unavailable. `fitCardText` now picks the largest size
that fits, with balanced line breaks, as a pure tested function; shrink-to-fit
stays on underneath as a backstop.

### Deck colours avoid green and orange

They are the correct and pass flashes, and a card the same colour as its own
flash makes the signature moment fail to read. The editor offers eight colours
from `deckColors`, none of them green or orange, which settles the item carried
over from M4 without a perceptual-distance check. An imported deck can still
arrive in any colour; the flash's word and icon keep it readable.

### Input mode lives in settings, not setup

Unchanged from M6, but now presented as a big two-way choice with a line on
how each works, because it changes how the round feels more than any other
setting.

## Shipping

### Ship config lives in the repo; brand sources do not

`eas.json`, `store.config.json` and the setup script are committed, so getting
to TestFlight is three commands from a fresh clone. The exported icon PNGs are
committed because the app will not build without them; the sources that
generated them stay out, per `.gitignore` and TRADEMARK.md.

### Expo SDK 57 patch alignment

Moved to expo 57.0.27 and React Native 0.86.3. 0.86.0 ships a Hermes build
with a known memory regression, and expo-doctor flagged 22 patch-level
mismatches against the SDK. The update is patch-only within SDK 57.

## Snapchat-style redesign

The second redesign, asked for by the product owner: model the interface on
Snapchat rather than Duolingo, for players in high school and college. The
first redesign read as a learning app — friendly, but the wrong room. The
engine, storage, sharing and tilt are untouched again.

### Borrow the grammar, not the brand

Dark canvas, full-bleed content, floating circles of glass, fat pill buttons,
swiping between pages, stories, chat lines with coloured sender labels, streaks.
Those are conventions this audience reads without thinking. Snapchat's ghost,
its exact yellow and its name are not borrowed: the accent is a warmer yellow,
Dex is a different character, and the app icon is black rather than yellow,
precisely so it never sits on a home screen looking like Snapchat's. That is
both the trademark line and App Review's copycat rule.

### Home is three pages you swipe between, and it opens on Play

Decks, Play, You — side by side in a paging scroll view with a bar along the
bottom. It opens on Play the way a camera app opens on the camera, because
nearly everyone opening a party game wants to start one. A plain horizontal
pager rather than a tab navigator: no new native dependency, still runs in
Expo Go, and swiping is the point.

### Play is a camera: decks are lenses, the start button is a shutter

The selected deck fills the screen like a viewfinder. Decks sit in a carousel
under a fixed shutter ring; swipe to change deck, tap the shutter to play. One
tap from opening the app to a phone on a forehead, with a "Just play" game on
the default rules. Teams and rules are one button away, pre-filled with the
deck you were looking at. "Mix it up" is the first lens: every playable deck
at once.

Quick play and the full setup flow both go through `useStartGame`, so a game
started either way is saved, resumed and scored identically.

### Streaks, stats and badges, derived and local

A daily streak, lifetime numbers and a handful of badges on the You page — the
gamification this audience expects. All of it is computed by `playStats` from
stored sessions, the same way score is computed from rounds: no counter on disk
that could drift from the games it claims to count. Days are local calendar
days, built from date parts so a clock change cannot break a streak; a streak
survives until the end of the day after the last game, the grace every streak
counter gives. Nothing is uploaded — there is nowhere to upload it to.

### Stories for how to play

Segments across the top, tap right for next and left for back, auto-advance,
a caption bar over a full-bleed colour. Under reduced motion the stories wait
for a tap instead of advancing on their own.

### Dex becomes a sticker

Thick white sticker border, ink outline, flat colour, emoji-simple eyes. The
cuddly blob suited a learning app; a sticker suits a camera app, and it reads
on the dark canvas, on a neon card and at icon size.

### Neon colours with black text

Yellow, green, blue, teal and orange all take near-black text; pink, purple and
red take white. `cardTextOn` already picked whichever clears AA large text, so
the flashes and cards became black-on-neon without any special case — and the
contrast test now asserts the stronger property that every deck colour gets
readable text, rather than that it gets white text.

### Card text is fitted against measured glyph widths

The new display face, Bricolage Grotesque, is narrow on average but uneven:
"Hummus" is a third wider per letter than "little". An average width truncated
short words — the ones drawn biggest — so `fitCardText` now measures against a
table of the face's real advance widths. Verified by rendering all 250 bundled
cards in the actual font at iPhone 15 and iPhone SE sizes: no overflow, the
widest line using 94% of the box, the smallest card at 74px.

### Database startup is shared, seeding included

Rendering the new Home exposed a latent race. Opening the database was shared,
but seeding the bundled decks ran once per `useDatabase` caller, and Home now
has two callers mounting in the same frame. Two seeds on one connection means
overlapping transactions and duplicate inserts. Open, migrate and seed are now
one promise per launch.

### The QR is always dark on white

On a dark theme the code had inherited the canvas colour as its background,
which would have produced dark modules on a dark background — a code nothing
can scan. It is now pinned to ink on white, inside a yellow frame.
