import { StyleSheet, View } from 'react-native';
import type { DeckSummary } from '@/decks/types';
import { summaryIsPlayable } from '@/decks/types';
import { cardTextOn } from './contrast';
import { Icon } from './Icon';
import { Raised } from './Raised';
import { Text } from './Text';
import { color, font, radius, space } from './tokens';

export type DeckCardProps = {
  deck: DeckSummary;
  onPress: () => void;
};

/**
 * A deck in the browser.
 *
 * The deck's colour is shown as a little stack of cards rather than a swatch,
 * because that is what it will actually look like on a forehead.
 */
export function DeckCard({ deck, onPress }: DeckCardProps) {
  const playable = summaryIsPlayable(deck);
  const initial = [...deck.name][0]?.toUpperCase() ?? '?';

  return (
    <Raised
      face={color.background}
      shade={color.line}
      border={color.line}
      radius={radius.lg}
      onPress={onPress}
      accessibilityLabel={`${deck.name}, ${deck.cardCount} ${deck.cardCount === 1 ? 'card' : 'cards'}`}
      accessibilityHint={playable ? undefined : 'Not enough cards to start a round'}
      style={styles.outer}
      faceStyle={styles.face}
    >
      <DeckStack accent={deck.accentColor} initial={initial} />

      <View style={styles.body}>
        <Text variant="heading" numberOfLines={1}>
          {deck.name}
        </Text>
        {deck.description ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {deck.description}
          </Text>
        ) : null}
        <Text variant="caption" tone={playable ? 'faint' : 'pass'}>
          {deck.cardCount} {deck.cardCount === 1 ? 'card' : 'cards'}
          {playable ? '' : ' · too few to play'}
        </Text>
      </View>

      <Icon name="forward" size={20} color={color.textFaint} weight={3} />
    </Raised>
  );
}

/** Two cards fanned behind the front one, in the deck's colour. */
export function DeckStack({ accent, initial, size = 56 }: { accent: string; initial: string; size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.card,
          { width: size * 0.78, height: size, backgroundColor: accent, opacity: 0.35, transform: [{ rotate: '12deg' }] },
        ]}
      />
      <View
        style={[
          styles.card,
          { width: size * 0.78, height: size, backgroundColor: accent, opacity: 0.6, transform: [{ rotate: '6deg' }] },
        ]}
      />
      <View style={[styles.card, styles.front, { width: size * 0.78, height: size, backgroundColor: accent }]}>
        <Text style={[styles.initial, { color: cardTextOn(accent), fontSize: size * 0.42, lineHeight: size * 0.52 }]}>
          {initial}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: 20,
    marginBottom: space.sm + 4,
  },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md - 2,
    paddingHorizontal: space.md,
  },
  body: {
    flex: 1,
    gap: 1,
  },
  card: {
    position: 'absolute',
    left: 4,
    top: 0,
    borderRadius: 8,
  },
  front: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: font.black,
  },
});
