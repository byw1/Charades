import { useEffect, useRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text as RNText, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MIN_PLAYABLE_CARDS } from '@/decks/types';
import type { GameMode } from '@/game/types';
import { CircleButton } from '@/ui/CircleButton';
import { cardTextOn } from '@/ui/contrast';
import { CARD_LETTER_SPACING, fitCardText } from '@/ui/fitText';
import { Mascot } from '@/ui/Mascot';
import { Tap } from '@/ui/Tap';
import { Text } from '@/ui/Text';
import { color, font, gutter, palette, radius, space } from '@/ui/tokens';

/** One lens in the carousel: a single deck, or every playable deck mixed. */
export type Lens = {
  key: string;
  name: string;
  accent: string;
  deckIds: string[];
  cardCount: number;
  /** For "Mix", a glyph instead of the deck's initial. */
  glyph?: string;
};

export type PlayPageProps = {
  lenses: Lens[];
  selected: number;
  onSelect: (index: number) => void;
  onPlay: (lens: Lens) => void;
  onSetup: (lens: Lens) => void;
  onOpenDeck: (lens: Lens) => void;
  streak: number;
  playedToday: boolean;
  onMe: () => void;
  /** A banner for a half-played game, if there is one. */
  resume?: ReactNode;
  starting: boolean;
  bottomInset: number;
  mode: GameMode;
  onMode: (mode: GameMode) => void;
};

/** The modes, in the order a camera app lists its modes: left to right. */
export const MODES: readonly { mode: GameMode; label: string; hint: string }[] = [
  { mode: 'classic', label: 'Classic', hint: 'Tap to play' },
  { mode: 'taboo', label: 'Taboo', hint: 'Tap to play · the room can’t say the words under the card' },
  { mode: 'threeRounds', label: '3 Rounds', hint: 'Tap to play · same cards, three ways' },
];

const LENS = 62;
const GAP = 16;
const STEP = LENS + GAP;
const RING = 86;

/**
 * Play. The camera screen of this app.
 *
 * The selected deck fills the screen the way a viewfinder does, and the decks
 * sit in a carousel under a fixed shutter ring, like lenses: swipe to change
 * deck, tap the shutter to play. One tap from opening the app to a phone on a
 * forehead, with teams and rules one button away for anyone who wants them.
 */
export function PlayPage({
  lenses,
  selected,
  onSelect,
  onPlay,
  onSetup,
  onOpenDeck,
  streak,
  playedToday,
  onMe,
  resume,
  starting,
  bottomInset,
  mode,
  onMode,
}: PlayPageProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const carousel = useRef<ScrollView>(null);
  const lens = lenses[selected] ?? lenses[0];

  // Keep the carousel on the selected lens when it is changed from outside,
  // and when the page first lays out.
  useEffect(() => {
    carousel.current?.scrollTo({ x: selected * STEP, animated: false });
    // Only on mount: during a swipe the carousel is the source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!lens) {
    return (
      <View style={[styles.page, styles.loading, { width, backgroundColor: color.background }]}>
        <Mascot size={120} mood="thinking" />
      </View>
    );
  }

  const accent = lens.accent;
  const ink = cardTextOn(accent);
  const playable = lens.cardCount >= MIN_PLAYABLE_CARDS;
  const title = fitCardText(lens.name, width - gutter * 4, height * 0.28, { maxSize: 84, minSize: 28 });

  const pressLens = (index: number) => {
    if (index === selected) {
      if (playable) onPlay(lens);
      else onOpenDeck(lens);
      return;
    }
    carousel.current?.scrollTo({ x: index * STEP, animated: true });
    onSelect(index);
  };

  return (
    <View style={[styles.page, { width, paddingBottom: bottomInset }]}>
      <View style={[styles.frame, { backgroundColor: accent }]}>
        <View style={[styles.blob, styles.blobOne]} pointerEvents="none" />
        <View style={[styles.blob, styles.blobTwo]} pointerEvents="none" />

        <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
          <Tap onPress={onMe} accessibilityLabel="Your stats" contentStyle={styles.avatar}>
            <Mascot size={40} animated={false} />
          </Tap>

          {streak > 0 ? (
            <View style={styles.streak} accessible accessibilityLabel={`${streak} day streak`}>
              <RNText style={styles.streakText}>
                🔥 {streak}
                {playedToday ? '' : ' ⏳'}
              </RNText>
            </View>
          ) : (
            <View />
          )}

          <CircleButton icon="settings" label="Teams and rules" tone="scrim" onPress={() => onSetup(lens)} />
        </View>

        {resume ? <View style={styles.resume}>{resume}</View> : null}

        <View style={styles.viewfinder} pointerEvents="none">
          <RNText
            style={[
              styles.deckName,
              { color: ink, fontSize: title.fontSize, lineHeight: title.lineHeight, letterSpacing: title.fontSize * CARD_LETTER_SPACING },
            ]}
            numberOfLines={title.lines.length}
            adjustsFontSizeToFit
            allowFontScaling={false}
          >
            {title.lines.join('\n')}
          </RNText>
          <Text style={[styles.meta, { color: ink }]}>
            {lens.key === 'mix' ? `${lens.deckIds.length} decks · ` : ''}
            {lens.cardCount} cards
          </Text>
        </View>

        <View style={styles.bottom}>
          <View style={styles.modes} accessibilityRole="tablist">
            {MODES.map((item) => {
              const active = item.mode === mode;
              return (
                <Tap
                  key={item.mode}
                  onPress={() => onMode(item.mode)}
                  squish={0.92}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${item.label} mode`}
                  contentStyle={[styles.mode, active && styles.modeActive]}
                >
                  <RNText style={[styles.modeText, active && styles.modeTextActive]} allowFontScaling={false}>
                    {item.label}
                  </RNText>
                </Tap>
              );
            })}
          </View>

          <Text style={[styles.hint, { color: ink }]} numberOfLines={1} adjustsFontSizeToFit>
            {starting
              ? 'Starting…'
              : playable
                ? (MODES.find((m) => m.mode === mode)?.hint ?? 'Tap to play')
                : `Needs ${MIN_PLAYABLE_CARDS} cards · tap to open`}
          </Text>

          <View style={styles.carouselWrap}>
            <ScrollView
              ref={carousel}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={STEP}
              decelerationRate="fast"
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingHorizontal: (width - LENS) / 2, gap: GAP, alignItems: 'center' }}
              onScroll={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / STEP);
                const clamped = Math.max(0, Math.min(lenses.length - 1, index));
                if (clamped !== selected) onSelect(clamped);
              }}
            >
              {lenses.map((item, index) => (
                <Tap
                  key={item.key}
                  onPress={() => pressLens(index)}
                  squish={0.9}
                  accessibilityLabel={index === selected ? `Play ${item.name}` : item.name}
                  accessibilityState={{ selected: index === selected }}
                  contentStyle={[styles.lens, { backgroundColor: item.accent }]}
                >
                  <RNText style={[styles.lensText, { color: cardTextOn(item.accent) }]} allowFontScaling={false}>
                    {item.glyph ?? [...item.name][0]?.toUpperCase() ?? '?'}
                  </RNText>
                </Tap>
              ))}
            </ScrollView>

            {/* The shutter: fixed in the middle, the selected lens sits inside it. */}
            <View pointerEvents="none" style={[styles.ring, { left: (width - RING) / 2, borderColor: ringColor(accent) }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

/** White unless the deck is so light a white ring would vanish into it. */
function ringColor(accent: string): string {
  return cardTextOn(accent) === color.bone ? color.bone : color.ink;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#000000' },
  frame: {
    flex: 1,
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  loading: { alignItems: 'center', justifyContent: 'center' },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)' },
  blobOne: { width: 360, height: 360, top: -140, left: -120 },
  blobTwo: { width: 300, height: 300, bottom: 120, right: -130 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter - 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streak: {
    backgroundColor: color.scrim,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  streakText: { fontFamily: font.heavy, fontSize: 16, lineHeight: 20, color: color.bone },
  resume: { paddingHorizontal: gutter, paddingTop: space.md },
  viewfinder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: gutter * 2,
    gap: space.sm,
  },
  deckName: { fontFamily: font.display, textAlign: 'center' },
  meta: { fontFamily: font.bold, fontSize: 15, lineHeight: 20, opacity: 0.85 },
  bottom: { alignItems: 'center', gap: space.md, paddingBottom: space.md },
  hint: { fontFamily: font.heavy, fontSize: 15, lineHeight: 20, paddingHorizontal: gutter },
  modes: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: color.scrim,
  },
  mode: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill },
  modeActive: { backgroundColor: color.bone },
  modeText: { fontFamily: font.heavy, fontSize: 14, lineHeight: 18, color: 'rgba(255,255,255,0.85)' },
  modeTextActive: { color: color.ink },
  carouselWrap: { width: '100%', height: RING + 8, justifyContent: 'center' },
  lens: {
    width: LENS,
    height: LENS,
    borderRadius: LENS / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  lensText: { fontFamily: font.display, fontSize: 26, lineHeight: 30 },
  ring: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 6,
    borderColor: color.bone,
  },
});

/** The "everything" lens, first in the carousel. */
export function mixLens(decks: { id: string; cardCount: number }[]): Lens {
  const playable = decks.filter((d) => d.cardCount >= MIN_PLAYABLE_CARDS);
  return {
    key: 'mix',
    name: 'Mix it up',
    accent: palette.yellow,
    deckIds: playable.map((d) => d.id),
    cardCount: playable.reduce((sum, d) => sum + d.cardCount, 0),
    glyph: '🔀',
  };
}
