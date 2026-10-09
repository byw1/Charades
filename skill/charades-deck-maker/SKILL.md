---
name: charades-deck-maker
description: "Makes custom decks for the iPhone party game Charades (Make Your Own Decks): the forehead-card guessing game. Use when someone asks for a charades deck, cards for a phone-on-your-forehead guessing game, a deck about their friends, trip, office or a show, or a .charades file."
---

# Charades deck maker

Charades is a party game: one player holds the phone to their forehead, a card
shows a word everyone else can see, and the room yells clues until the holder
guesses it. You write the cards and hand back a file the app opens.

## 1. Work out the deck

From the request, settle these. Ask at most one short question, and only if
the theme is unclear; otherwise use the defaults.

- **Theme.** What the cards are about.
- **How many cards.** Default 40. At least 10 (the app needs 10 to start a
  round); 100 is the size of the app's own decks.
- **Banned words.** Optional. For the "Banned words" mode, up to 5 words per
  card that the clue-givers may not say. Add them when asked for, or when the
  deck is for a competitive group.
- **Personal details.** For a deck about a group (names, inside jokes, places),
  use what the person told you. Never invent facts about real private people.

## 2. Write good cards

- Short: 1 to 4 words is ideal, 60 characters at most. It is read at arm's
  length across a room.
- Guessable: things most of this group will know. Mix about 60% easy, 30%
  medium, 10% hard.
- Actable: favour things you can describe, hum or act out.
- No duplicates, no near-duplicates, no answer hidden in another card.
- Banned words are the most obvious clues: the words a clue-giver would reach
  for first. Never the card's own words.
- Family-friendly unless the person asks otherwise.
- Emoji-only cards (like "🦁👑") are fine; put the answer in the card's `hint`.

## 3. Build the file

Write the deck as JSON, then run the script. It fills in IDs and dates, checks
every rule the app checks, and packs the deck the way the app shares decks.

```json
{
  "name": "Line Legends",
  "description": "Everything from our Disneyland trip.",
  "emoji": "🎢",
  "color": "teal",
  "cards": [
    "Churro",
    { "text": "Two-hour line", "banned": ["wait", "queue", "long"] },
    { "text": "🐭👂", "hint": "Mouse ears" }
  ]
}
```

- `name`: up to 60 characters. `description`: up to 280. Both optional but
  give them.
- `emoji`: one emoji for the deck's cover.
- `color`: one of pink, purple, blue, teal, red, yellow, indigo, magenta, or a
  hex like `#FF3D8B`. Avoid green and orange; they are the game's own flashes.
- `cards`: strings, or objects with `text`, optional `banned` (up to 5) and
  optional `hint` (up to 140 characters).

```bash
python3 scripts/make_deck.py deck.json --out /mnt/user-data/outputs
```

Use whichever output folder this environment offers for files the person can
download; the script prints where the file went. It needs only the Python
standard library.

## 4. Hand it over

Give the person:

1. **The `.charades` file.** On iPhone, open it from Files, Messages or
   AirDrop and it opens straight in Charades.
2. **The web link** the script prints (bywilliaml.com/charades/decks#d=...).
   Open it on a laptop and scan the code with the iPhone camera. The deck
   rides in the part of the link after `#`, which browsers never send to a
   server.
3. A short list of a few sample cards so they can see what they got.

If the script reports errors, fix the JSON and run it again. Warnings (a long
card, under 10 cards) are worth mentioning but do not block the deck.

## Without code execution

If you cannot run scripts, output the deck JSON from step 3 in one code block
and tell the person to paste it at https://bywilliaml.com/charades/decks,
which turns it into a code and a file in their browser.
