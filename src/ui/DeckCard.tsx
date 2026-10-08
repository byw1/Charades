import { StyleSheet, Text as RNText, View, type StyleProp, type ViewStyle } from 'react-native';
import { DEFAULT_DECK_EMOJI, summaryIsPlayable, type DeckSummary } from '@/decks/types';
import { cardTextOn } from './contrast';
import { EmojiSticker } from './EmojiSticker';
import { Tap } from './Tap';
import { Text } from './Text';
import { color, font, radius, space } from './tokens';

export type DeckCardProps = {
  deck: DeckSummary;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * A deck as a cover tile: full colour, the deck's emoji stuck on like a
 * sticker with a giant faded copy behind it, and a little card peeking out
 * with a real card from the deck on it — so you can tell what you are getting
 * before you open it. Tall rather than wide, so two sit side by side and the
 * browser scrolls like a feed.
 */
export function DeckCard({ deck, onPress, style }: DeckCardProps) {
  const playable = summaryIsPlayable(deck);
  const ink = cardTextOn(deck.accentColor);
  const emoji = deck.emoji ?? DEFAULT_DECK_EMOJI;
  const count = `${deck.cardCount} ${deck.cardCount === 1 ? 'card' : 'cards'}`;

  return (
    <Tap
      onPress={onPress}
      squish={0.96}
      accessibilityLabel={`${deck.name}, ${count}${deck.favorite ? ', favourite' : ''}`}
      accessibilityHint={playable ? undefined : 'Not enough cards to start a round'}
      style={style}
      contentStyle={[styles.tile, { backgroundColor: deck.accentColor }]}
    >
      <RNText style={styles.watermark} accessible={false} allowFontScaling={false}>
        {emoji}
      </RNText>

      <View style={styles.top}>
        <View style={styles.pills}>
          <View style={[styles.pill, { backgroundColor: ink === color.bone ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.35)' }]}>
            <Text style={[styles.pillText, { color: ink }]}>
              {deck.favorite ? '❤️ ' : ''}
              {count}
            </Text>
          </View>
          {deck.mineCount > 0 || deck.hiddenCount > 0 ? (
            <View style={[styles.pill, { backgroundColor: color.bone }]}>
              <Text style={[styles.pillText, { color: color.ink }]}>✏️ yours</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.sticker}>
          <EmojiSticker emoji={emoji} size={54} />
        </View>
      </View>

      {deck.sample ? (
        <View style={styles.peek} accessible={false}>
          <RNText style={styles.peekText} numberOfLines={2} allowFontScaling={false}>
            {deck.sample}
          </RNText>
        </View>
      ) : (
        <View />
      )}

      <View style={styles.bottom}>
        {playable ? null : (
          <View style={[styles.pill, styles.warn]}>
            <Text style={[styles.pillText, { color: color.ink }]}>too few to play</Text>
          </View>
        )}
        <Text style={[styles.name, { color: ink }]} numberOfLines={2}>
          {deck.name}
        </Text>
        {deck.description ? (
          <Text style={[styles.description, { color: ink }]} numberOfLines={1}>
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
  watermark: {
    position: 'absolute',
    right: -30,
    bottom: -22,
    fontSize: 130,
    lineHeight: 150,
    opacity: 0.22,
    transform: [{ rotate: '-14deg' }],
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  sticker: { marginTop: -2, marginRight: -2 },
  peek: {
    alignSelf: 'flex-start',
    maxWidth: '86%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    transform: [{ rotate: '-5deg' }],
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  peekText: { fontFamily: font.display, fontSize: 15, lineHeight: 18, color: color.ink },
  pills: { gap: 4, alignItems: 'flex-start', flexShrink: 1 },
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  warn: { backgroundColor: color.bone },
  pillText: { fontFamily: font.heavy, fontSize: 12, lineHeight: 16 },
  bottom: { gap: 4 },
  name: { fontFamily: font.display, fontSize: 22, lineHeight: 24, letterSpacing: -0.4 },
  description: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, opacity: 0.85 },
});
