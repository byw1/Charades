import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { DeckSummary } from '@/decks/types';
import { summaryIsPlayable } from '@/decks/types';
import { cardTextOn } from './contrast';
import { Tap } from './Tap';
import { Text } from './Text';
import { color, font, radius, space } from './tokens';

export type DeckCardProps = {
  deck: DeckSummary;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * A deck as a cover tile: full colour, the first letter blown up as cover art,
 * the name set big at the bottom. Tall rather than wide, so two sit side by
 * side and the browser scrolls like a feed.
 */
export function DeckCard({ deck, onPress, style }: DeckCardProps) {
  const playable = summaryIsPlayable(deck);
  const ink = cardTextOn(deck.accentColor);
  const initial = [...deck.name][0]?.toUpperCase() ?? '?';
  const count = `${deck.cardCount} ${deck.cardCount === 1 ? 'card' : 'cards'}`;

  return (
    <Tap
      onPress={onPress}
      squish={0.96}
      accessibilityLabel={`${deck.name}, ${count}`}
      accessibilityHint={playable ? undefined : 'Not enough cards to start a round'}
      style={style}
      contentStyle={[styles.tile, { backgroundColor: deck.accentColor }]}
    >
      <Text style={[styles.initial, { color: ink }]} accessible={false}>
        {initial}
      </Text>

      <View style={styles.top}>
        <View style={[styles.pill, { backgroundColor: ink === color.bone ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.35)' }]}>
          <Text style={[styles.pillText, { color: ink }]}>{count}</Text>
        </View>
        {playable ? null : (
          <View style={[styles.pill, styles.warn]}>
            <Text style={[styles.pillText, { color: color.ink }]}>too few to play</Text>
          </View>
        )}
      </View>

      <View style={styles.bottom}>
        <Text style={[styles.name, { color: ink }]} numberOfLines={2}>
          {deck.name}
        </Text>
        {deck.description ? (
          <Text style={[styles.description, { color: ink }]} numberOfLines={2}>
            {deck.description}
          </Text>
        ) : null}
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  tile: {
    aspectRatio: 0.78,
    borderRadius: radius.lg,
    padding: space.md - 4,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  initial: {
    position: 'absolute',
    right: -14,
    top: -28,
    fontFamily: font.display,
    fontSize: 170,
    lineHeight: 190,
    opacity: 0.16,
  },
  top: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  warn: { backgroundColor: color.bone },
  pillText: { fontFamily: font.heavy, fontSize: 12, lineHeight: 16 },
  bottom: { gap: 4 },
  name: { fontFamily: font.display, fontSize: 22, lineHeight: 24, letterSpacing: -0.4 },
  description: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, opacity: 0.85 },
});
