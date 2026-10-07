import { decodeBase64Url, encodeBase64Url, utf8Decode, utf8Encode } from './base64url';
import { addCard, addPhotoCards, createDeck, setDeckFields } from './edit';
import {
  collectQrPart,
  deckFileName,
  deckLink,
  decodeDeck,
  encodeDeck,
  extractPayload,
  fitsInQr,
  measure,
  payloadFromLink,
  MAX_QR_PARTS,
  PAYLOAD_PREFIX,
  routeForIncoming,
  QR_PART_LIMIT,
  QR_PAYLOAD_LIMIT,
  splitForQr,
  withoutPhotos,
  type QrCollection,
} from './share';
import type { Deck } from './types';

const NOW = '2026-07-26T18:00:00Z';

function deckOf(count: number, name = 'Test Deck'): Deck {
  return Array.from({ length: count }, (_, i) => `Card number ${i}`).reduce(
    (deck, text) => addCard(deck, text, NOW),
    createDeck({ now: NOW, name }),
  );
}

describe('base64url', () => {
  it('round-trips arbitrary bytes', () => {
    for (const length of [0, 1, 2, 3, 4, 5, 100, 1000]) {
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i += 1) bytes[i] = (i * 37) % 256;

      const decoded = decodeBase64Url(encodeBase64Url(bytes));
      expect(Array.from(decoded!)).toEqual(Array.from(bytes));
    }
  });

  it('round-trips every byte value', () => {
    const bytes = new Uint8Array(256);
    for (let i = 0; i < 256; i += 1) bytes[i] = i;
    expect(Array.from(decodeBase64Url(encodeBase64Url(bytes))!)).toEqual(Array.from(bytes));
  });

  /** The whole reason for base64url: these break inside a URL. */
  it('never emits characters that are unsafe in a link', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const bytes = new Uint8Array(64);
      for (let i = 0; i < 64; i += 1) bytes[i] = (i * seed * 31 + seed) % 256;

      const encoded = encodeBase64Url(bytes);
      expect(encoded).not.toMatch(/[+/=]/);
      expect(encoded).toMatch(/^[A-Za-z0-9\-_]*$/);
    }
  });

  it('still accepts standard base64, for a payload pasted from elsewhere', () => {
    const bytes = new Uint8Array([251, 255, 190, 254]);
    const standard = Buffer.from(bytes).toString('base64');
    expect(Array.from(decodeBase64Url(standard)!)).toEqual(Array.from(bytes));
  });

  it('tolerates padding and surrounding whitespace', () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const encoded = encodeBase64Url(bytes);
    expect(Array.from(decodeBase64Url(`  ${encoded}==  `)!)).toEqual(Array.from(bytes));
  });

  it.each(['!!!', 'abc$def', 'a', '💥'])('rejects %p', (input) => {
    expect(decodeBase64Url(input)).toBeNull();
  });
});

describe('utf8', () => {
  it.each([
    'plain ascii',
    'Ñoño',
    '日本語のカード',
    '🍕 ピザ 🎉',
    'Emoji with skin tone 👍🏽',
    '',
  ])('round-trips %p', (text) => {
    expect(utf8Decode(utf8Encode(text))).toBe(text);
  });

  it('handles a surrogate pair at the end of a string', () => {
    expect(utf8Decode(utf8Encode('end 🎬'))).toBe('end 🎬');
  });
});

describe('encoding a deck', () => {
  it('round-trips a deck exactly', () => {
    const deck = setDeckFields(deckOf(30), { description: 'For testing.' }, NOW);
    const result = decodeDeck(encodeDeck(deck));

    expect(result.ok).toBe(true);
    expect(result.ok && result.deck).toEqual(deck);
  });

  it('preserves card ids, so an imported deck keeps its identity', () => {
    const deck = deckOf(10);
    const result = decodeDeck(encodeDeck(deck));
    expect(result.ok && result.deck.cards.map((c) => c.id)).toEqual(deck.cards.map((c) => c.id));
  });

  it('preserves notes, emoji and non-Latin text', () => {
    let deck = createDeck({ now: NOW, name: '絵文字 🎉' });
    deck = addCard(deck, '🍕 ピザ', NOW);
    deck = setDeckFields(deck, { description: 'Ñoño' }, NOW);

    const result = decodeDeck(encodeDeck(deck));
    expect(result.ok && result.deck.name).toBe('絵文字 🎉');
    expect(result.ok && result.deck.cards[0]?.text).toBe('🍕 ピザ');
    expect(result.ok && result.deck.description).toBe('Ñoño');
  });

  it('is smaller than the raw JSON', () => {
    const size = measure(deckOf(100));
    expect(size.compressionRatio).toBeLessThan(0.6);
  });

  it('carries a payload version prefix', () => {
    expect(encodeDeck(deckOf(5)).startsWith(PAYLOAD_PREFIX)).toBe(true);
  });

  it('produces a link-safe payload', () => {
    expect(encodeDeck(deckOf(50))).toMatch(/^D\d+\.[A-Za-z0-9\-_]+$/);
  });
});

describe('QR capacity', () => {
  /**
   * Every bundled deck is 50 cards, so the common case has to fit with room
   * to spare.
   */
  it('fits a 50-card deck with room to spare', () => {
    const size = measure(deckOf(50));
    expect(size.fitsQr).toBe(true);
    expect(size.bytes).toBeLessThan(QR_PAYLOAD_LIMIT * 0.7);
  });

  /** The spec's target: decks up to about 150 cards should fit. */
  it('fits a 150-card deck', () => {
    expect(measure(deckOf(150)).fitsQr).toBe(true);
  });

  /**
   * Pins the real cost per card, which is what sets the ceiling. Card ids are
   * random hex and do not compress, so a card costs about 11 bytes of payload
   * whatever its text is. Fails loudly if the payload format ever changes
   * enough to move the limit out from under the 150-card target.
   */
  it('costs about 11 bytes per card regardless of text', () => {
    const perCard = (measure(deckOf(150)).bytes - measure(deckOf(50)).bytes) / 100;
    expect(perCard).toBeGreaterThan(9);
    expect(perCard).toBeLessThan(13);
  });

  it('falls back to a file well before a QR stops being scannable', () => {
    expect(measure(deckOf(250)).fitsQr).toBe(false);
    // Stays under the 2953-byte version 40 ceiling at low error correction,
    // so anything accepted here is genuinely encodable.
    expect(QR_PAYLOAD_LIMIT).toBeLessThan(2900);
  });

  it('reports honestly when a deck is too big', () => {
    expect(measure(deckOf(1000)).fitsQr).toBe(false);
  });

  it('agrees with the standalone check', () => {
    const size = measure(deckOf(50));
    expect(fitsInQr(size.payload)).toBe(size.fitsQr);
  });
});

describe('deep links', () => {
  it('builds a link the app can read back', () => {
    const deck = deckOf(20);
    const link = deckLink(deck);

    expect(link.startsWith('deckhead://deck?d=')).toBe(true);
    expect(decodeDeck(payloadFromLink(link)!).ok).toBe(true);
  });

  it('survives a link that has been percent-encoded in transit', () => {
    const deck = deckOf(20);
    const payload = encodeDeck(deck);
    const link = `deckhead://deck?d=${encodeURIComponent(payload)}`;

    expect(decodeDeck(payloadFromLink(link)!).ok).toBe(true);
  });

  it('finds the payload alongside other query parameters', () => {
    const payload = encodeDeck(deckOf(5));
    expect(payloadFromLink(`deckhead://deck?from=sam&d=${payload}&v=2`)).toBe(payload);
  });

  it('returns null for a link with no payload', () => {
    expect(payloadFromLink('deckhead://deck')).toBeNull();
    expect(payloadFromLink('https://example.com')).toBeNull();
  });
});

describe('pasted text', () => {
  /** People paste the link, the payload, or a whole message containing one. */
  it('accepts a bare payload', () => {
    const payload = encodeDeck(deckOf(5));
    expect(extractPayload(payload)).toBe(payload);
  });

  it('accepts a full link', () => {
    const deck = deckOf(5);
    expect(extractPayload(deckLink(deck))).toBe(encodeDeck(deck));
  });

  it('finds a link inside a message', () => {
    const deck = deckOf(5);
    const message = `hey try my deck\n\n${deckLink(deck)}\n\nit's good`;
    expect(decodeDeck(extractPayload(message)!).ok).toBe(true);
  });

  it('finds a bare payload inside a message', () => {
    const payload = encodeDeck(deckOf(5));
    expect(extractPayload(`here you go: ${payload} enjoy`)).toBe(payload);
  });

  it('returns null when there is nothing to find', () => {
    expect(extractPayload('')).toBeNull();
    expect(extractPayload('   ')).toBeNull();
    expect(extractPayload('just a normal message')).toBeNull();
  });
});

describe('decode failures', () => {
  it('explains an empty payload', () => {
    expect(decodeDeck('')).toMatchObject({ ok: false, reason: 'corrupt' });
  });

  it('explains something that is not a deck at all', () => {
    const result = decodeDeck('hello world');
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toMatch(/does not look like/);
  });

  it('tells the user to update for a newer payload version', () => {
    const payload = encodeDeck(deckOf(5)).replace(/^D1\./, 'D99.');
    const result = decodeDeck(payload);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('unsupportedPayloadVersion');
    expect(result.ok === false && result.message).toMatch(/newer version of Deckhead/);
  });

  it('reports damage rather than crashing on truncated data', () => {
    const payload = encodeDeck(deckOf(50));
    const truncated = payload.slice(0, Math.floor(payload.length / 2));

    const result = decodeDeck(truncated);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toMatch(/damaged/);
  });

  it('reports damage rather than crashing on corrupted bytes', () => {
    const payload = encodeDeck(deckOf(50));
    const corrupted = `${payload.slice(0, 20)}ZZZZ${payload.slice(24)}`;
    expect(() => decodeDeck(corrupted)).not.toThrow();
    expect(decodeDeck(corrupted).ok).toBe(false);
  });

  it('never throws on arbitrary junk', () => {
    for (const junk of ['D1.', 'D1.!!!!', 'D1.AAAA', 'D0.AAAA', '{}', '[]', 'D1.' + 'A'.repeat(500)]) {
      expect(() => decodeDeck(junk)).not.toThrow();
      expect(decodeDeck(junk).ok).toBe(false);
    }
  });

  it('rejects a payload carrying a deck from a future schema version', () => {
    const deck = { ...deckOf(12), schemaVersion: 99 } as Deck;
    const result = decodeDeck(encodeDeck(deck));

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('unsupportedSchemaVersion');
  });

  it('passes validator warnings through for a short deck', () => {
    const result = decodeDeck(encodeDeck(deckOf(3)));
    expect(result.ok).toBe(true);
    expect(result.ok && result.warnings.length).toBeGreaterThan(0);
  });
});

describe('file names', () => {
  it('uses the deck name', () => {
    expect(deckFileName(deckOf(1, 'Emo Bands'))).toBe('Emo Bands.deckhead');
  });

  it('strips characters that break a filesystem', () => {
    expect(deckFileName(deckOf(1, 'A/B\\C:D*E?"<>|'))).toBe('ABCDE.deckhead');
  });

  it('keeps letters from other alphabets', () => {
    expect(deckFileName(deckOf(1, '日本語'))).toBe('日本語.deckhead');
  });

  it('falls back when the name has nothing usable in it', () => {
    expect(deckFileName(deckOf(1, '///'))).toBe('deck.deckhead');
    expect(deckFileName(deckOf(1, '   '))).toBe('deck.deckhead');
  });

  it('caps the length', () => {
    const name = deckFileName(deckOf(1, 'A'.repeat(200)));
    expect(name.length).toBeLessThanOrEqual(40 + '.deckhead'.length);
  });
});

describe('photos and sharing', () => {
  const photo = `data:image/jpeg;base64,${'A'.repeat(4000)}`;
  const withPhotos = () => addPhotoCards(deckOf(12), [photo, photo], NOW);

  it('keeps photos out of codes and links, and in files', () => {
    const deck = withPhotos();
    const size = measure(deck);
    expect(size.photos).toBe(2);

    const viaCode = decodeDeck(size.payload);
    if (!viaCode.ok) throw new Error(viaCode.message);
    expect(viaCode.deck.cards.some((c) => c.image)).toBe(false);
    // The photo card is still there, as words.
    expect(viaCode.deck.cards).toHaveLength(14);

    const viaFile = decodeDeck(size.filePayload);
    if (!viaFile.ok) throw new Error(viaFile.message);
    expect(viaFile.deck.cards.filter((c) => c.image)).toHaveLength(2);

    const viaLink = decodeDeck(payloadFromLink(deckLink(deck))!);
    expect(viaLink.ok && viaLink.deck.cards.some((c) => c.image)).toBe(false);
  });

  it('leaves a deck without photos untouched', () => {
    const deck = deckOf(10);
    expect(withoutPhotos(deck)).toBe(deck);
    expect(measure(deck).filePayload).toBe(measure(deck).payload);
  });
});

describe('big decks over several codes', () => {
  const payloadOf = (cards: number) => encodeDeck(deckOf(cards));

  it('needs only one code for a normal deck', () => {
    expect(measure(deckOf(50)).qrParts).toBeNull();
  });

  it('splits a big deck into codes that each fit comfortably', () => {
    const size = measure(deckOf(400));
    expect(size.fitsQr).toBe(false);
    expect(size.qrParts!.length).toBeGreaterThan(1);
    for (const part of size.qrParts!) expect(part.length).toBeLessThanOrEqual(QR_PART_LIMIT);
  });

  it('puts the deck back together from codes scanned in any order, with repeats', () => {
    const payload = payloadOf(400);
    const parts = splitForQr(payload);
    const order = [...parts].reverse();
    order.splice(1, 0, parts[parts.length - 1]!); // the same code twice

    let collection: QrCollection | null = null;
    let finished: string | null = null;
    for (const part of order) {
      const result = collectQrPart(collection, part);
      if (result.status === 'collecting') collection = result.collection;
      if (result.status === 'complete') finished = result.payload;
    }
    expect(finished).toBe(payload);
    expect(decodeDeck(finished!).ok).toBe(true);
  });

  it('reports which pieces are new, so the scanner only buzzes once per code', () => {
    const parts = splitForQr(payloadOf(400));
    const first = collectQrPart(null, parts[0]!);
    if (first.status !== 'collecting') throw new Error('expected collecting');
    const again = collectQrPart(first.collection, parts[0]!);
    expect(again).toMatchObject({ status: 'collecting', isNew: false, have: 1 });
  });

  it('starts over when a code from a different deck turns up', () => {
    const a = splitForQr(payloadOf(400));
    const b = splitForQr(encodeDeck(deckOf(400, 'Another Deck')));
    const first = collectQrPart(null, a[0]!);
    if (first.status !== 'collecting') throw new Error('expected collecting');
    const switched = collectQrPart(first.collection, b[0]!);
    expect(switched).toMatchObject({ status: 'collecting', have: 1 });
    if (switched.status === 'collecting') expect(switched.collection.tag).not.toBe(first.collection.tag);
  });

  it('rejects a damaged piece rather than importing a broken deck', () => {
    const parts = splitForQr(payloadOf(400));
    let collection: QrCollection | null = null;
    let last: ReturnType<typeof collectQrPart> | null = null;
    parts.forEach((part, i) => {
      const damaged = i === 1 ? part.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')) : part;
      last = collectQrPart(collection, damaged);
      if (last.status === 'collecting') collection = last.collection;
    });
    expect(last).toEqual({ status: 'invalid' });
  });

  it('ignores something that is not a piece', () => {
    expect(collectQrPart(null, 'D1.abc')).toEqual({ status: 'invalid' });
    expect(collectQrPart(null, 'DQ1.x.3.2.abc')).toEqual({ status: 'invalid' });
  });

  it('gives up on codes for a deck so big it should go as a file', () => {
    expect(measure(deckOf(2000)).qrParts === null || measure(deckOf(2000)).qrParts!.length <= MAX_QR_PARTS).toBe(true);
  });
});

describe('routeForIncoming', () => {
  it('sends an AirDropped or opened file to the import preview', () => {
    const url = 'file:///private/var/mobile/Containers/Data/Application/X/Documents/Inbox/Dorm%20Floor.deckhead';
    expect(routeForIncoming(url)).toBe(`/decks/import?file=${encodeURIComponent(url)}`);
  });

  it('recognises a .deckhead path even without a file scheme', () => {
    expect(routeForIncoming('/var/mobile/Inbox/Deck.deckhead')).toMatch(/^\/decks\/import\?file=/);
  });

  it('sends a deck link to the import preview with its payload', () => {
    const link = deckLink(deckOf(12));
    const route = routeForIncoming(link)!;
    expect(route).toMatch(/^\/decks\/import\?payload=/);
    const payload = decodeURIComponent(route.split('payload=')[1]!);
    expect(decodeDeck(payload).ok).toBe(true);
  });

  it('leaves anything else to the router', () => {
    expect(routeForIncoming('deckhead://settings')).toBeNull();
    expect(routeForIncoming('/decks/abc')).toBeNull();
    expect(routeForIncoming('')).toBeNull();
  });
});
