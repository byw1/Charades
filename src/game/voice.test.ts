import { heard, hints, judge, words } from './voice';

describe('words', () => {
  it('ignores case, accents and punctuation', () => {
    expect(words('Beyoncé — “Single Ladies”!')).toEqual(['beyonce', 'single', 'ladies']);
  });
});

describe('heard', () => {
  it('finds a phrase said in the middle of a sentence', () => {
    expect(heard(words('wait is it the lion king'), 'The Lion King')).toBe(true);
  });

  it('lets a leading "the" go unsaid', () => {
    expect(heard(words('lion king'), 'The Lion King')).toBe(true);
  });

  it('allows a plural either way', () => {
    expect(heard(words('penguins'), 'Penguin')).toBe(true);
    expect(heard(words('an oreo'), 'Oreos')).toBe(true);
  });

  it('needs whole words, in order', () => {
    expect(heard(words('catalogue'), 'Cat')).toBe(false);
    expect(heard(words('king lion'), 'The Lion King')).toBe(false);
  });
});

describe('judge', () => {
  const jaws = { text: 'Jaws', note: null, taboo: ['shark', 'beach'] };

  it('calls got it when the answer is heard', () => {
    expect(judge(['is it jaws'], jaws, 'classic')).toEqual({ kind: 'correct' });
  });

  it('accepts the answer from any of the recogniser’s guesses', () => {
    expect(judge(['is it jars', 'is it jaws'], jaws, 'classic')).toEqual({ kind: 'correct' });
  });

  it('busts a forbidden word in Taboo, before the answer can count', () => {
    expect(judge(['the shark film jaws'], jaws, 'taboo')).toEqual({ kind: 'busted', word: 'shark' });
  });

  it('only busts on the best guess, since a false bust costs a point', () => {
    expect(judge(['the park', 'the shark'], jaws, 'taboo')).toBeNull();
  });

  it('ignores forbidden words outside Taboo mode', () => {
    expect(judge(['shark'], jaws, 'classic')).toBeNull();
  });

  it('listens for an emoji card’s answer, not its emoji', () => {
    const card = { text: '🦁👑', note: 'The Lion King' };
    expect(judge(['lion king'], card, 'classic', true)).toEqual({ kind: 'correct' });
    expect(hints(card, true)).toEqual(['The Lion King']);
  });
});
