#!/usr/bin/env python3
"""Builds a .charades deck file from a loose JSON description.

Usage: python3 make_deck.py deck.json [--out DIR]
       cat deck.json | python3 make_deck.py - [--out DIR]

Mirrors the app's own rules (src/decks/validate.ts and share.ts in
byw1/Deckhead): a deck is JSON, zlib-compressed, base64url-encoded without
padding, prefixed "D1.". The same text works as a .charades file, inside a
charades:// link, or in a QR code. Standard library only.
"""

import argparse
import base64
import datetime
import hashlib
import json
import os
import re
import secrets
import sys
import zlib

WEB_MAKER = "https://bywilliaml.com/charades/decks"
COLORS = {
    "pink": "#FF3D8B",
    "purple": "#9B5CFF",
    "blue": "#2EA8FF",
    "teal": "#00C2B2",
    "red": "#FF3B47",
    "yellow": "#FFE500",
    "indigo": "#5B5BFF",
    "violet": "#5B5BFF",
    "magenta": "#E040FB",
}
PALETTE = list(dict.fromkeys(COLORS.values()))
PICTOGRAPHIC = re.compile(
    "[©®‼-㊙\U0001f000-\U0001faff☀-➿]"
)
LIMITS = dict(name=60, description=280, author=40, tags=10, tag=24, note=140,
              cards=2000, card_soft=60, banned=5, banned_word=32, emoji=16,
              playable=10)


def text(value):
    return value.strip() if isinstance(value, str) else ""


def clean_words(words):
    seen, out = set(), []
    for raw in words:
        word = text(raw)
        if word and word.lower() not in seen:
            seen.add(word.lower())
            out.append(word)
    return out


def pick_color(value, name):
    raw = text(value)
    if re.fullmatch(r"#[0-9a-fA-F]{6}", raw):
        return raw.upper()
    if re.fullmatch(r"#[0-9a-fA-F]{3}", raw):
        return "#" + "".join(c * 2 for c in raw[1:]).upper()
    if raw.lower() in COLORS:
        return COLORS[raw.lower()]
    digest = hashlib.sha256(name.encode()).digest()
    return PALETTE[digest[0] % len(PALETTE)]


def build(source):
    errors, warnings = [], []
    if isinstance(source, list):
        source = {"cards": source}
    if not isinstance(source, dict):
        return None, ["That is not a deck: it needs a name and a list of cards."], warnings

    name = text(source.get("name") or source.get("title")) or "My deck"
    if len(name) > LIMITS["name"]:
        errors.append(f"Deck names are limited to {LIMITS['name']} characters.")
    description = text(source.get("description"))
    if len(description) > LIMITS["description"]:
        errors.append(f"Descriptions are limited to {LIMITS['description']} characters.")
    author = text(source.get("author"))
    if len(author) > LIMITS["author"]:
        errors.append(f"Author names are limited to {LIMITS['author']} characters.")

    emoji = text(source.get("emoji"))
    if emoji and (len(emoji) > LIMITS["emoji"] or not PICTOGRAPHIC.search(emoji)):
        warnings.append("The cover emoji could not be read, so the deck uses the default.")
        emoji = ""

    tags = source.get("tags") if isinstance(source.get("tags"), list) else []
    tags = [t[: LIMITS["tag"]] for t in clean_words(tags)][: LIMITS["tags"]]

    raw_cards = source.get("cards")
    if not isinstance(raw_cards, list):
        return None, errors + ['There is no list of cards. Add "cards": ["...", "..."].'], warnings
    if len(raw_cards) > LIMITS["cards"]:
        errors.append(f"Decks are limited to {LIMITS['cards']} cards.")

    cards, seen_text, seen_ids = [], set(), set()
    for i, raw in enumerate(raw_cards, 1):
        record = {"text": raw} if isinstance(raw, str) else raw
        if not isinstance(record, dict):
            errors.append(f"Card {i} is not a card.")
            continue
        card_text = text(record.get("text") or record.get("word") or record.get("answer"))
        if not card_text:
            errors.append(f"Card {i} is empty.")
            continue
        if card_text.lower() in seen_text:
            warnings.append(f'"{card_text}" is in the deck twice, so the copy was dropped.')
            continue
        seen_text.add(card_text.lower())
        if len(card_text) > LIMITS["card_soft"]:
            warnings.append(f'"{card_text[:30]}..." is long; over {LIMITS["card_soft"]} characters is hard to read.')

        note = text(record.get("note") or record.get("hint"))[: LIMITS["note"]] or None
        banned = record.get("taboo") or record.get("banned") or record.get("bannedWords") or []
        taboo = [w for w in clean_words(banned if isinstance(banned, list) else [])
                 if len(w) <= LIMITS["banned_word"]]
        if len(taboo) > LIMITS["banned"]:
            warnings.append(f"Card {i} had more than {LIMITS['banned']} banned words; the first {LIMITS['banned']} were kept.")
            taboo = taboo[: LIMITS["banned"]]

        card_id = text(record.get("id"))
        while not re.fullmatch(r"crd_[0-9a-f]{8}", card_id) or card_id in seen_ids:
            card_id = "crd_" + secrets.token_hex(4)
        seen_ids.add(card_id)

        card = {"id": card_id, "text": card_text, "note": note}
        if taboo:
            card["taboo"] = taboo
        cards.append(card)

    if errors:
        return None, errors, warnings
    if len(cards) < LIMITS["playable"]:
        warnings.append(f"This deck has {len(cards)} cards. It needs {LIMITS['playable']} to start a round.")

    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    deck_id = text(source.get("id"))
    deck = {
        "schemaVersion": 1,
        "id": deck_id if re.fullmatch(r"dck_[0-9a-f]{8}", deck_id) else "dck_" + secrets.token_hex(4),
        "name": name,
        "description": description,
        "author": author,
        "language": "en",
        "accentColor": pick_color(source.get("accentColor") or source.get("color"), name),
        "tags": tags,
        "createdAt": now,
        "updatedAt": now,
        "cards": cards,
    }
    if emoji:
        deck["emoji"] = emoji
    return deck, errors, warnings


def encode(deck):
    raw = json.dumps(deck, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    packed = base64.urlsafe_b64encode(zlib.compress(raw, 9)).decode("ascii").rstrip("=")
    return "D1." + packed


def file_name(name):
    base = re.sub(r"[^\w -]", "", name.strip(), flags=re.UNICODE)
    base = re.sub(r"\s+", " ", base).strip()[:40] or "deck"
    return base + ".charades"


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("deck", help="Path to the deck JSON, or - for stdin")
    parser.add_argument("--out", default=".", help="Folder for the .charades file")
    args = parser.parse_args()

    raw = sys.stdin.read() if args.deck == "-" else open(args.deck, encoding="utf-8").read()
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    try:
        source = json.loads(fenced.group(1) if fenced else raw)
    except json.JSONDecodeError as error:
        print(f"ERROR: the deck is not valid JSON ({error}).", file=sys.stderr)
        return 1

    deck, errors, warnings = build(source)
    for warning in warnings:
        print(f"WARNING: {warning}")
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    payload = encode(deck)
    os.makedirs(args.out, exist_ok=True)
    path = os.path.join(args.out, file_name(deck["name"]))
    with open(path, "w", encoding="ascii") as handle:
        handle.write(payload)

    print(f"Deck: {deck.get('emoji', '🃏')} {deck['name']} ({len(deck['cards'])} cards)")
    print(f"File: {os.path.abspath(path)}")
    print(f"Scan from a laptop: {WEB_MAKER}#d={payload}")
    if len(payload) <= 2100:
        print(f"App link (tap on iPhone): charades://deck?d={payload}")
    print("Sample: " + ", ".join(card["text"] for card in deck["cards"][:5]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
