import { buildGroupDeck, DEFAULT_GROUP_DECK_NAME, GROUP_PROMPTS, groupCards } from './group';
import { validateDeck } from './validate';

const now = '2026-10-07T20:00:00Z';

describe('group deck builder', () => {
  it('turns every line of every answer into a card', () => {
    const cards = groupCards({
      answers: { people: 'Sam\nAlex\n\n  Jo  ', places: 'The diner', jokes: 'Canoe trip' },
    });
    expect(cards.map((c) => c.text)).toEqual(['Sam', 'Alex', 'Jo', 'The diner', 'Canoe trip']);
  });

  it('keeps who says a catchphrase as a hint, not on the card', () => {
    const [card] = groupCards({ answers: { sayings: 'Five more minutes | Jo' } });
    expect(card).toMatchObject({ text: 'Five more minutes', note: 'Says it: Jo' });
  });

  it('drops repeats across questions, whatever the capitals', () => {
    const cards = groupCards({ answers: { people: 'Sam', jokes: 'sam\nSAM' } });
    expect(cards).toHaveLength(1);
  });

  it('puts photo cards first, named', () => {
    const image = 'data:image/jpeg;base64,AAAA';
    const cards = groupCards({ answers: { people: 'Sam\nAlex' }, photos: [{ image, name: 'Alex' }] });
    expect(cards[0]).toMatchObject({ text: 'Alex', image });
    // Alex is already a photo card, so the typed name is not repeated.
    expect(cards.map((c) => c.text)).toEqual(['Alex', 'Sam']);
  });

  it('builds a valid deck with a sensible default name', () => {
    const deck = buildGroupDeck({
      answers: { people: Array.from({ length: 12 }, (_, i) => `Friend ${i}`).join('\n') },
      accentColor: '#FF3D8B',
      now,
    });
    expect(deck.name).toBe(DEFAULT_GROUP_DECK_NAME);
    const result = validateDeck(deck);
    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('asks a handful of questions, each with an example', () => {
    expect(GROUP_PROMPTS.length).toBeGreaterThanOrEqual(4);
    for (const prompt of GROUP_PROMPTS) expect(prompt.example.length).toBeGreaterThan(0);
  });
});
