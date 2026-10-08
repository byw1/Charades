import { useEffect, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Card } from '@/decks/types';
import { useDatabase } from '@/hooks/useDatabase';
import { getDeck } from '@/storage/deckRepo';
import { Button } from '@/ui/Button';
import { cardTextOn } from '@/ui/contrast';
import { CARD_LETTER_SPACING, fitCardText } from '@/ui/fitText';
import { useLayout } from '@/ui/layout';
import { Loader } from '@/ui/Loader';
import { Text } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';
import { color, font, gutter, radius, space } from '@/ui/tokens';

type PreviewCard = Card & { accent: string };

export type CardPreviewProps = {
  visible: boolean;
  title: string;
  deckIds: readonly string[];
  /** Mix previews a shuffled handful from every deck rather than all of them. */
  shuffle?: boolean;
  onClose: () => void;
  onPlay?: () => void;
  onEdit?: () => void;
};

const MIX_SAMPLE = 40;

/**
 * A look inside a deck from the Play screen: its cards as cards, one at a
 * time, swiped through like a deck in the hand. Words only — nobody is
 * holding this to their forehead.
 */
export function CardPreview({ visible, title, deckIds, shuffle = false, onClose, onPlay, onEdit }: CardPreviewProps) {
  const database = useDatabase();
  const { width, height, short } = useLayout();
  const [cards, setCards] = useState<PreviewCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const key = deckIds.join(',');

  useEffect(() => {
    if (!visible || database.status !== 'ready') return;
    let cancelled = false;
    const { db } = database;

    void (async () => {
      const decks = await Promise.all(key.split(',').map((id) => getDeck(db, id)));
      const all = decks.flatMap((deck) => (deck ? deck.cards.map((card) => ({ ...card, accent: deck.accentColor })) : []));
      const list = shuffle ? sample(all, MIX_SAMPLE) : all;
      if (!cancelled) {
        setCards(list);
        setIndex(0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [database, key, shuffle, visible]);

  const cardW = Math.min(width - gutter * 2, short ? height * 1.1 : 420);
  const cardH = short ? height * 0.5 : Math.min(cardW * 1.15, height * 0.48);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <SafeAreaView style={styles.sheet} edges={['top', 'bottom', 'left', 'right']}>
        <TopBar leading="close" onLeading={onClose} leadingLabel="Close preview" title={title} />

        {!cards ? (
          <Loader label="Dealing the cards" />
        ) : cards.length === 0 ? (
          <Text variant="body" tone="muted" align="center" style={styles.empty}>
            No cards to show yet.
          </Text>
        ) : (
          <View style={styles.body}>
            <FlatList
              data={cards}
              keyExtractor={(card, i) => `${card.id}-${i}`}
              horizontal
              style={styles.pager}
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
              renderItem={({ item }) => (
                <View style={[styles.page, { width }]}>
                  <MiniCard card={item} width={cardW} height={cardH} />
                </View>
              )}
              getItemLayout={(_data, i) => ({ length: width, offset: width * i, index: i })}
            />
            <Text variant="label" tone="muted" align="center">
              {shuffle ? 'A shuffled handful · ' : ''}Card {Math.min(index + 1, cards.length)} of {cards.length} · swipe for more
            </Text>
          </View>
        )}

        <View style={[styles.actions, short && styles.actionsRow]}>
          {onPlay ? <Button label="Play these" variant="primary" icon="play" size="lg" onPress={onPlay} style={styles.grow} /> : null}
          {onEdit ? <Button label="Edit cards" icon="edit" size="lg" onPress={onEdit} style={styles.grow} /> : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function MiniCard({ card, width, height }: { card: PreviewCard; width: number; height: number }) {
  const ink = cardTextOn(card.accent);
  const fit = fitCardText(card.text, width - 48, height * (card.taboo ? 0.5 : 0.75), { maxSize: 64, minSize: 18 });

  return (
    <View style={[styles.card, { width, height, backgroundColor: card.accent }]}>
      <RNText
        style={[
          styles.cardText,
          { color: ink, fontSize: fit.fontSize, lineHeight: fit.lineHeight, letterSpacing: fit.fontSize * CARD_LETTER_SPACING },
        ]}
        numberOfLines={fit.lines.length}
        adjustsFontSizeToFit
        allowFontScaling={false}
      >
        {fit.lines.join('\n')}
      </RNText>
      {card.note ? <RNText style={[styles.note, { color: ink }]}>{card.note}</RNText> : null}
      {card.taboo ? (
        <View style={styles.taboo}>
          <RNText style={styles.tabooLabel}>🚫 DON’T SAY</RNText>
          <RNText style={styles.tabooWords}>{card.taboo.join(' · ')}</RNText>
        </View>
      ) : null}
      {card.mine ? (
        <View style={styles.yours}>
          <RNText style={styles.yoursText}>YOURS</RNText>
        </View>
      ) : null}
    </View>
  );
}

/** A random handful, without repeats. */
function sample<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, count);
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: color.background },
  body: { flex: 1, justifyContent: 'center', gap: space.md },
  pager: { flexGrow: 0 },
  page: { alignItems: 'center', justifyContent: 'center' },
  card: {
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    gap: space.sm,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  cardText: { fontFamily: font.card, textAlign: 'center' },
  note: { fontFamily: font.bold, fontSize: 15, lineHeight: 20, opacity: 0.85, textAlign: 'center' },
  taboo: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 4,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(10,10,13,0.82)',
  },
  tabooLabel: { fontFamily: font.heavy, fontSize: 11, letterSpacing: 1.2, color: '#FF6B75' },
  tabooWords: { fontFamily: font.heavy, fontSize: 15, lineHeight: 20, color: '#FFFFFF', textAlign: 'center' },
  yours: {
    position: 'absolute',
    top: space.md,
    right: space.md,
    backgroundColor: color.bone,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  yoursText: { fontFamily: font.heavy, fontSize: 10, lineHeight: 14, color: color.ink, letterSpacing: 0.6 },
  empty: { flex: 1, paddingTop: space.xxl },
  actions: { gap: space.sm, paddingHorizontal: gutter, paddingBottom: space.sm },
  actionsRow: { flexDirection: 'row' },
  grow: { flexGrow: 1 },
});
