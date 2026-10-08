import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text as RNText, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEFAULT_DECK_EMOJI, MIN_PLAYABLE_CARDS } from '@/decks/types';
import type { GameMode } from '@/game/types';
import { CircleButton } from '@/ui/CircleButton';
import { cardTextOn } from '@/ui/contrast';
import { EmojiSticker } from '@/ui/EmojiSticker';
import { CARD_LETTER_SPACING, fitCardText } from '@/ui/fitText';
import { useLayout } from '@/ui/layout';
import { Loader } from '@/ui/Loader';
import { Icon, type IconName } from '@/ui/Icon';
import { Mascot } from '@/ui/Mascot';
import { Float, PopIn } from '@/ui/motion';
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
  /** The deck's emoji: on its lens, and stuck all over the viewfinder. */
  emoji: string;
  /** Extra emoji scattered round the viewfinder. Mix uses its decks' emoji. */
  stickers?: string[];
  /** Starred decks come first. Mix is never starred. */
  favorite?: boolean;
};

/**
 * Where the scattered stickers sit, as fractions of the viewfinder. Fixed
 * rather than random so the layout never jumps between renders, and kept to
 * the edges so they never sit on the deck name.
 */
const STICKER_SPOTS = [
  { top: 0.03, left: 0.06, size: 44, rotate: '-14deg' },
  { top: 0.1, right: 0.08, size: 56, rotate: '12deg' },
  { top: 0.86, left: 0.07, size: 48, rotate: '9deg' },
  { top: 0.8, right: 0.1, size: 40, rotate: '-10deg' },
  { top: 0.22, left: 0.03, size: 32, rotate: '18deg' },
] as const;

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
  /** Look through the deck's cards without leaving Play. */
  onPreview: (lens: Lens) => void;
  onFavorite: (lens: Lens) => void;
  onEdit: (lens: Lens) => void;
  /** How the carousel is ordered, shown on the sort button. */
  sortLabel: string;
  onSort: () => void;
};

/** The modes, in the order a camera app lists its modes: left to right. */
export const MODES: readonly { mode: GameMode; label: string; hint: string }[] = [
  { mode: 'classic', label: 'Classic', hint: 'Tap to play' },
  { mode: 'taboo', label: 'Banned', hint: 'Tap to play · some words are off limits' },
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
  onPreview,
  onFavorite,
  onEdit,
  sortLabel,
  onSort,
}: PlayPageProps) {
  const { width, height, short: sideways } = useLayout();
  const insets = useSafeAreaInsets();
  const carousel = useRef<ScrollView>(null);
  const lens = lenses[selected] ?? lenses[0];
  // The carousel's own width. Sideways it gets half the screen, and turning
  // the phone changes it, so it is measured rather than assumed.
  const [rail, setRail] = useState(width);

  // Keep the carousel on the selected lens when the page first lays out,
  // when the rail changes size (turning the phone), and when the decks are
  // reordered (a star, a new sort). During a swipe the carousel itself is the
  // source of truth, so a plain change of selection does not scroll it.
  useEffect(() => {
    carousel.current?.scrollTo({ x: selected * STEP, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rail, lenses]);

  if (!lens) {
    return (
      <View style={[styles.page, styles.loading, { width, backgroundColor: color.background }]}>
        <Loader />
      </View>
    );
  }

  const accent = lens.accent;
  const ink = cardTextOn(accent);
  const playable = lens.cardCount >= MIN_PLAYABLE_CARDS;
  // Sideways, the deck takes the left half and the controls the right.
  const titleWidth = sideways ? (width - insets.left - insets.right) / 2 - gutter * 2 : width - gutter * 4;
  const title = fitCardText(lens.name, titleWidth, height * (sideways ? 0.3 : 0.28), {
    maxSize: sideways ? 60 : 84,
    minSize: 24,
  });

  const pressLens = (index: number) => {
    if (index === selected) {
      if (playable) onPlay(lens);
      else onOpenDeck(lens);
      return;
    }
    carousel.current?.scrollTo({ x: index * STEP, animated: true });
    onSelect(index);
  };

  const mix = lens.key === 'mix';

  const viewfinder = (
    <View style={[styles.viewfinder, sideways && styles.viewfinderSideways]} pointerEvents="box-none">
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {STICKER_SPOTS.map((spot, i) => {
          const sticker = (lens.stickers ?? [])[i % Math.max(1, lens.stickers?.length ?? 0)] ?? lens.emoji;
          return (
            <Float
              key={`${lens.key}-${i}`}
              delay={i * 370}
              style={[
                styles.floating,
                {
                  top: `${spot.top * 100}%`,
                  ...('left' in spot ? { left: `${spot.left * 100}%` } : { right: `${spot.right * 100}%` }),
                },
              ]}
            >
              <PopIn delay={60 + i * 50}>
                <RNText
                  accessible={false}
                  allowFontScaling={false}
                  style={{ fontSize: spot.size, lineHeight: spot.size * 1.2, transform: [{ rotate: spot.rotate }] }}
                >
                  {sticker}
                </RNText>
              </PopIn>
            </Float>
          );
        })}
      </View>
      {/* Keyed by deck, so every swipe pops the new deck's sticker in. */}
      <PopIn key={lens.key} style={styles.badge}>
        <EmojiSticker emoji={lens.emoji} size={sideways ? 60 : 88} tilt={-8} />
      </PopIn>
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
        {mix ? `${lens.deckIds.length} decks · ` : ''}
        {lens.cardCount} cards
      </Text>

      {/* Things to do with this deck, without leaving Play. */}
      <View style={styles.actions}>
        <Pill icon="eye" label="Peek" onPress={() => onPreview(lens)} />
        {mix ? (
          <Pill icon="decks" label="Pick decks" onPress={() => onSetup(lens)} />
        ) : (
          <>
            <Pill
              icon={lens.favorite ? 'heartFilled' : 'heart'}
              label={lens.favorite ? 'Faved' : 'Fave'}
              onPress={() => onFavorite(lens)}
              tint={lens.favorite ? palette.red : undefined}
            />
            <Pill icon="edit" label="Edit" onPress={() => onEdit(lens)} />
          </>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={[styles.bottom, sideways && styles.bottomSideways]}>
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

      <View style={styles.carouselWrap} onLayout={(event) => setRail(event.nativeEvent.layout.width)}>
        <ScrollView
          ref={carousel}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={STEP}
          decelerationRate="fast"
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: (rail - LENS) / 2, gap: GAP, alignItems: 'center' }}
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
              <RNText style={styles.lensEmoji} allowFontScaling={false}>
                {item.emoji}
              </RNText>
            </Tap>
          ))}
        </ScrollView>

        {/* The shutter: fixed in the middle, the selected lens sits inside it. */}
        <View pointerEvents="none" style={[styles.ring, { left: (rail - RING) / 2, borderColor: ringColor(accent) }]} />
      </View>
    </View>
  );

  return (
    <View style={[styles.page, { width, paddingBottom: bottomInset }]}>
      <View style={[styles.frame, { backgroundColor: accent }]}>
        <View style={[styles.blob, styles.blobOne]} pointerEvents="none" />
        <View style={[styles.blob, styles.blobTwo]} pointerEvents="none" />

        <View
          style={[
            styles.top,
            {
              paddingTop: insets.top + (sideways ? space.xs : space.sm),
              paddingLeft: insets.left + gutter - 4,
              paddingRight: insets.right + gutter - 4,
            },
          ]}
        >
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

          <View style={styles.topRight}>
            <Tap onPress={onSort} accessibilityLabel={`Sort decks. Now: ${sortLabel}`} contentStyle={styles.sort}>
              <Icon name="sort" size={16} color={color.bone} weight={3} />
              <RNText style={styles.sortText} allowFontScaling={false}>
                {sortLabel}
              </RNText>
            </Tap>
            <CircleButton icon="settings" label="Teams and rules" tone="scrim" onPress={() => onSetup(lens)} />
          </View>
        </View>

        {resume ? <View style={styles.resume}>{resume}</View> : null}

        <View style={[styles.body, sideways && styles.bodySideways, { paddingLeft: insets.left, paddingRight: insets.right }]}>
          {viewfinder}
          {controls}
        </View>
      </View>
    </View>
  );
}

/** A small glassy action on the viewfinder. */
function Pill({ icon, label, onPress, tint }: { icon: IconName; label: string; onPress: () => void; tint?: string }) {
  return (
    <Tap onPress={onPress} squish={0.92} accessibilityLabel={label} contentStyle={styles.pill}>
      <Icon name={icon} size={16} color={tint ?? color.bone} weight={3} />
      <RNText style={styles.pillText} allowFontScaling={false}>
        {label}
      </RNText>
    </Tap>
  );
}

/** White unless the deck is so light a white ring would vanish into it. */
function ringColor(accent: string): string {
  return cardTextOn(accent) === color.bone ? color.bone : color.ink;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.chrome },
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
  body: { flex: 1 },
  bodySideways: { flexDirection: 'row' },
  viewfinderSideways: { paddingHorizontal: gutter, gap: 4 },
  bottomSideways: { flex: 1, justifyContent: 'center', paddingBottom: space.sm },
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
  lensEmoji: { fontSize: 28, lineHeight: 34 },
  floating: { position: 'absolute', opacity: 0.55 },
  badge: { marginBottom: space.xs },
  actions: { flexDirection: 'row', gap: space.sm, paddingTop: space.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: color.scrim,
  },
  pillText: { fontFamily: font.heavy, fontSize: 13, lineHeight: 16, color: color.bone },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sort: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: color.scrim,
  },
  sortText: { fontFamily: font.heavy, fontSize: 13, lineHeight: 16, color: color.bone },
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
export function mixLens(decks: { id: string; cardCount: number; emoji: string | null }[]): Lens {
  const playable = decks.filter((d) => d.cardCount >= MIN_PLAYABLE_CARDS);
  return {
    key: 'mix',
    name: 'Mix it up',
    accent: palette.yellow,
    deckIds: playable.map((d) => d.id),
    cardCount: playable.reduce((sum, d) => sum + d.cardCount, 0),
    emoji: '🎲',
    stickers: playable.map((d) => d.emoji ?? DEFAULT_DECK_EMOJI).slice(0, STICKER_SPOTS.length),
  };
}
