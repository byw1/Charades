import { deflate, inflate } from 'pako';
import { decodeBase64Url, encodeBase64Url, utf8Decode, utf8Encode } from './base64url';
import type { Deck } from './types';
import { validateDeck, type FailureReason, type ValidationIssue } from './validate';

/**
 * Deck sharing.
 *
 * Deck JSON → gzip → base64url. This is the feature the product hangs on: the
 * incumbent technically has custom decks and almost nobody uses them, because
 * sharing one is painful.
 *
 * The payload format carries a version prefix of its own, separate from the
 * deck's schemaVersion. They answer different questions — "can this build read
 * this envelope" versus "can this build read this deck" — and a future change
 * to compression must not be mistaken for a change to the deck shape.
 */

export const PAYLOAD_VERSION = 1;
export const PAYLOAD_PREFIX = `D${PAYLOAD_VERSION}.`;

export const DECK_FILE_EXTENSION = 'deckhead';
export const DECK_LINK_SCHEME = 'deckhead';

/**
 * How much compressed payload goes in a QR code.
 *
 * The spec suggests 1.5KB as the comfortable ceiling, aiming at decks up to
 * about 150 cards. Measured, those two do not agree: card ids are random hex
 * and do not compress, so every card costs about 11 bytes of payload whatever
 * its text, and 1.5KB runs out at 105 cards.
 *
 * Raised to 2.1KB to hit the spec's actual target, because the constraint
 * behind the 1.5KB figure does not apply here. A QR is scanned phone to phone
 * at arm's length off a bright screen, not read across a dim room — that is
 * the card face's problem, not this one. At low error correction a version 40
 * code holds about 2.9KB, so 2.1KB lands near version 34 with real margin.
 *
 * Roughly 160 cards. Bigger decks fall back to a file, and the export screen
 * says so plainly rather than rendering something that will not scan.
 */
export const QR_PAYLOAD_LIMIT = 2100;

/**
 * Low error correction, deliberately.
 *
 * The usual argument for higher levels is print damage and dirt. This code
 * lives on a screen for ten seconds. Spending capacity on recovery would mean
 * a denser code for the same deck, which is the opposite of what helps.
 */
export const QR_ERROR_CORRECTION = 'L' as const;

export function encodeDeck(deck: Deck): string {
  const json = JSON.stringify(deck);
  const compressed = deflate(utf8Encode(json), { level: 9 });
  return PAYLOAD_PREFIX + encodeBase64Url(compressed);
}

export type DecodeResult =
  | { ok: true; deck: Deck; warnings: ValidationIssue[] }
  | { ok: false; reason: DecodeFailure; message: string };

export type DecodeFailure = FailureReason | 'unsupportedPayloadVersion' | 'corrupt';

/**
 * Reverses encodeDeck and validates the result.
 *
 * Every failure is a message a person can act on, because this runs on
 * whatever a QR scanner or a paste box hands it.
 */
export function decodeDeck(payload: string): DecodeResult {
  const trimmed = payload.trim();
  if (!trimmed) {
    return { ok: false, reason: 'corrupt', message: 'There is nothing here to import.' };
  }

  const match = /^D(\d+)\./.exec(trimmed);
  if (!match) {
    return {
      ok: false,
      reason: 'corrupt',
      message: 'This does not look like a Deckhead deck.',
    };
  }

  const version = Number(match[1]);
  if (version > PAYLOAD_VERSION) {
    return {
      ok: false,
      reason: 'unsupportedPayloadVersion',
      message: 'This deck was shared from a newer version of Deckhead. Update the app to open it.',
    };
  }

  const bytes = decodeBase64Url(trimmed.slice(match[0].length));
  if (!bytes || bytes.length === 0) {
    return { ok: false, reason: 'corrupt', message: 'This deck is damaged and cannot be read.' };
  }

  let json: string;
  try {
    json = utf8Decode(inflate(bytes));
  } catch {
    return { ok: false, reason: 'corrupt', message: 'This deck is damaged and cannot be read.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, reason: 'corrupt', message: 'This deck is damaged and cannot be read.' };
  }

  const result = validateDeck(parsed);
  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason,
      message: result.errors[0]?.message ?? 'This deck cannot be read.',
    };
  }

  return { ok: true, deck: result.deck, warnings: result.warnings };
}

/**
 * The deck without its photos.
 *
 * A single photo is bigger than a whole QR code can hold, so codes and links
 * carry the words only. A photo card still works without its photo: its text
 * is the answer. Files carry everything.
 */
export function withoutPhotos(deck: Deck): Deck {
  if (!deck.cards.some((card) => card.image)) return deck;
  return {
    ...deck,
    cards: deck.cards.map((card) => {
      if (!card.image) return card;
      const { image: _photo, ...rest } = card;
      return rest;
    }),
  };
}

export function photoCount(deck: Deck): number {
  return deck.cards.filter((card) => card.image).length;
}

/** `deckhead://deck?d=<payload>`, without photos. */
export function deckLink(deck: Deck): string {
  return `${DECK_LINK_SCHEME}://deck?d=${encodeDeck(withoutPhotos(deck))}`;
}

/** Pulls a payload out of a deep link, or returns null. */
export function payloadFromLink(url: string): string | null {
  // Restricted to the payload alphabet rather than "anything but & and #".
  // The looser form also matched whitespace, so a link pasted inside a message
  // swallowed the words after it and decoded as damaged.
  const match = /[?&]d=([A-Za-z0-9\-_+/=%.]+)/.exec(url);
  if (!match) return null;

  try {
    return decodeURIComponent(match[1]!);
  } catch {
    return match[1]!;
  }
}

/**
 * Where an incoming URL should land.
 *
 * Two things open the app from outside: a deckhead:// link, which carries a
 * deck, and a .deckhead file from AirDrop, Files, Mail or Messages, which iOS
 * hands over as a file:// URL. Both go to the import preview — never a silent
 * install. Anything else is left to the router.
 */
export function routeForIncoming(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const isFile =
    /^file:/i.test(trimmed) || new RegExp(`\\.${DECK_FILE_EXTENSION}$`, 'i').test(trimmed.split('?')[0] ?? '');
  if (isFile) return `/decks/import?file=${encodeURIComponent(trimmed)}`;

  const payload = payloadFromLink(trimmed);
  if (payload) return `/decks/import?payload=${encodeURIComponent(payload)}`;

  return null;
}

/**
 * Finds a payload in whatever the user pasted.
 *
 * People paste the whole link as often as the payload, and sometimes a whole
 * message with the link in it. Rejecting those would be technically correct
 * and useless.
 */
export function extractPayload(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const fromLink = payloadFromLink(trimmed);
  if (fromLink) return fromLink;

  const bare = /D\d+\.[A-Za-z0-9\-_+/=]+/.exec(trimmed);
  return bare ? bare[0] : null;
}

export function fitsInQr(payload: string): boolean {
  return payload.length <= QR_PAYLOAD_LIMIT;
}

/** A filename safe on every platform, derived from the deck name. */
export function deckFileName(deck: Deck): string {
  const base =
    deck.name
      .trim()
      .replace(/[^\p{L}\p{N} _-]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40) || 'deck';

  return `${base}.${DECK_FILE_EXTENSION}`;
}

export type ShareSize = {
  /** What a code or link carries: the deck without photos. */
  payload: string;
  /** What a file carries: everything, photos included. */
  filePayload: string;
  bytes: number;
  fitsQr: boolean;
  /**
   * When the deck is too big for one code: the sequence of codes that carry
   * it, shown one after another. Null when one code is enough, or when even a
   * sequence would be too long to scan comfortably.
   */
  qrParts: string[] | null;
  photos: number;
  /** Roughly how much smaller the compressed form is, for the export screen. */
  compressionRatio: number;
};

export function measure(deck: Deck): ShareSize {
  const lean = withoutPhotos(deck);
  const payload = encodeDeck(lean);
  const photos = photoCount(deck);
  const raw = JSON.stringify(lean).length;
  const fits = fitsInQr(payload);
  const parts = fits ? null : splitForQr(payload);

  return {
    payload,
    filePayload: photos > 0 ? encodeDeck(deck) : payload,
    bytes: payload.length,
    fitsQr: fits,
    qrParts: parts && parts.length <= MAX_QR_PARTS ? parts : null,
    photos,
    compressionRatio: raw === 0 ? 1 : payload.length / raw,
  };
}

/**
 * Big decks over a sequence of codes.
 *
 * The payload is cut into pieces and each piece goes in its own code, tagged
 * with which deck it belongs to and where it goes: `DQ1.<deck>.<n>.<of>.<piece>`.
 * The sharing phone flips through them; the scanning phone collects them in
 * any order and puts the deck back together once it has them all. Smaller
 * codes than the single-code limit, because a code that is on screen for a
 * second has to scan on the first try.
 */
export const QR_PART_PREFIX = 'DQ1';
export const QR_PART_LIMIT = 1200;
/** Past this many codes, holding a camera steady gets tedious: send a file. */
export const MAX_QR_PARTS = 12;

/** A short tag for a payload, so pieces of two decks can never be mixed. */
function payloadTag(payload: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function splitForQr(payload: string, limit = QR_PART_LIMIT): string[] {
  const tag = payloadTag(payload);
  // Room for the header, generously: "DQ1.<tag>.<nn>.<nn>."
  const size = Math.max(1, limit - (QR_PART_PREFIX.length + tag.length + 10));
  const total = Math.max(1, Math.ceil(payload.length / size));
  return Array.from(
    { length: total },
    (_, i) => `${QR_PART_PREFIX}.${tag}.${i + 1}.${total}.${payload.slice(i * size, (i + 1) * size)}`,
  );
}

export function isQrPart(data: string): boolean {
  return data.startsWith(`${QR_PART_PREFIX}.`);
}

export type QrCollection = { tag: string; total: number; pieces: Record<number, string> };

export type CollectResult =
  | { status: 'collecting'; collection: QrCollection; have: number; total: number; isNew: boolean }
  | { status: 'complete'; payload: string }
  | { status: 'invalid' };

/**
 * Adds a scanned piece. A piece from a different deck starts over, since the
 * person has evidently moved on to another code.
 */
export function collectQrPart(collection: QrCollection | null, data: string): CollectResult {
  const match = /^DQ1\.([0-9a-z]+)\.(\d+)\.(\d+)\.(.*)$/s.exec(data.trim());
  if (!match) return { status: 'invalid' };

  const tag = match[1]!;
  const index = Number(match[2]);
  const total = Number(match[3]);
  const piece = match[4]!;
  if (!Number.isInteger(total) || total < 1 || total > 99 || index < 1 || index > total) {
    return { status: 'invalid' };
  }

  const current = collection && collection.tag === tag && collection.total === total ? collection : { tag, total, pieces: {} };
  const isNew = current.pieces[index] === undefined;
  const next: QrCollection = { ...current, pieces: { ...current.pieces, [index]: piece } };
  const have = Object.keys(next.pieces).length;

  if (have < total) return { status: 'collecting', collection: next, have, total, isNew };

  const payload = Array.from({ length: total }, (_, i) => next.pieces[i + 1] ?? '').join('');
  // The tag doubles as a checksum: a mangled piece shows up here.
  return payloadTag(payload) === tag ? { status: 'complete', payload } : { status: 'invalid' };
}
