import { deckPrompt, parseGeneratedCards } from './generate';

describe('parseGeneratedCards', () => {
  it('reads one card per line', () => {
    expect(parseGeneratedCards('Pizza\nSushi\nTacos')).toEqual(['Pizza', 'Sushi', 'Tacos']);
  });

  it('strips numbering, bullets, quotes and bold', () => {
    const text = '1. Pizza\n2) "Sushi"\n- Tacos\n• **Ramen**\n* Burrito.';
    expect(parseGeneratedCards(text)).toEqual(['Pizza', 'Sushi', 'Tacos', 'Ramen', 'Burrito']);
  });

  it('drops a chatty opening line and explanations after a dash', () => {
    const text = 'Here are 30 cards for your theme:\nThe Eiffel Tower – a landmark in Paris\nCroissant: a pastry';
    expect(parseGeneratedCards(text)).toEqual(['The Eiffel Tower', 'Croissant']);
  });

  it('keeps hyphenated names whole', () => {
    expect(parseGeneratedCards('Spider-Man\nT-Rex')).toEqual(['Spider-Man', 'T-Rex']);
  });

  it('drops repeats and anything too long for a card', () => {
    const long = 'a'.repeat(80);
    expect(parseGeneratedCards(`Pizza\npizza\n${long}`)).toEqual(['Pizza']);
  });

  it('stops at the limit', () => {
    const text = Array.from({ length: 50 }, (_, i) => `Card ${i}`).join('\n');
    expect(parseGeneratedCards(text, 30)).toHaveLength(30);
  });
});

describe('deckPrompt', () => {
  it('names the theme and the count', () => {
    expect(deckPrompt('  our spring break trip ', 30)).toBe('Theme: our spring break trip\nWrite 30 different cards for this theme.');
  });
});
