import { fireEvent, render, screen } from '@testing-library/react-native';
import type { DeckSummary } from '@/decks/types';
import { DeckCard } from './DeckCard';

/**
 * The spec asks for smoke tests here, not exhaustive component coverage. This
 * checks the things a person would notice: the count reads correctly, an
 * unplayable deck says so, and tapping it goes somewhere.
 */

function summary(overrides: Partial<DeckSummary> = {}): DeckSummary {
  return {
    id: 'dck_00000001',
    name: 'Films Everyone Knows',
    description: 'Everyone has at least heard of it.',
    author: 'Deckhead',
    accentColor: '#FF3D6E',
    emoji: '🍿',
    tags: ['film'],
    source: 'bundled',
    cardCount: 50,
    sample: 'Jurassic Park',
    updatedAt: '2026-07-26T18:00:00Z',
    favorite: false,
    mineCount: 0,
    hiddenCount: 0,
    ...overrides,
  };
}

describe('DeckCard', () => {
  it('shows the deck name, description and card count', () => {
    render(<DeckCard deck={summary()} onPress={jest.fn()} />);

    expect(screen.getByText('Films Everyone Knows')).toBeTruthy();
    expect(screen.getByText('Everyone has at least heard of it.')).toBeTruthy();
    expect(screen.getByText(/50 cards/)).toBeTruthy();
  });

  it('says card, not cards, for a deck of one', () => {
    render(<DeckCard deck={summary({ cardCount: 1 })} onPress={jest.fn()} />);
    expect(screen.getByText(/^1 card/)).toBeTruthy();
  });

  it('marks a deck with too few cards to play', () => {
    render(<DeckCard deck={summary({ cardCount: 4 })} onPress={jest.fn()} />);
    expect(screen.getByText(/too few to play/)).toBeTruthy();
  });

  it('does not mark a playable deck', () => {
    render(<DeckCard deck={summary({ cardCount: 10 })} onPress={jest.fn()} />);
    expect(screen.queryByText(/too few to play/)).toBeNull();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<DeckCard deck={summary()} onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows the deck’s emoji and a peek at its first card', () => {
    render(<DeckCard deck={summary()} onPress={jest.fn()} />);
    expect(screen.getAllByText('🍿').length).toBeGreaterThan(0);
    expect(screen.getByText('Jurassic Park')).toBeTruthy();
  });

  it('falls back to a card emoji for a deck without one', () => {
    render(<DeckCard deck={summary({ emoji: null, sample: null })} onPress={jest.fn()} />);
    expect(screen.getAllByText('🃏').length).toBeGreaterThan(0);
  });

  it('labels itself for VoiceOver with the name and count', () => {
    render(<DeckCard deck={summary()} onPress={jest.fn()} />);
    expect(screen.getByLabelText('Films Everyone Knows, 50 cards')).toBeTruthy();
  });

  it('survives a deck with no description', () => {
    render(<DeckCard deck={summary({ description: '' })} onPress={jest.fn()} />);
    expect(screen.getByText('Films Everyone Knows')).toBeTruthy();
  });

  it('shows a name that starts with an emoji whole', () => {
    render(<DeckCard deck={summary({ name: '🎬 Films' })} onPress={jest.fn()} />);
    expect(screen.getByText('🎬 Films')).toBeTruthy();
  });
});
