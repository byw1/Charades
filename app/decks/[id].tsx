import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, View } from 'react-native';
import { duplicateDeck } from '@/decks/edit';
import { DEFAULT_DECK_EMOJI, isPlayable, MIN_PLAYABLE_CARDS, type StoredDeck } from '@/decks/types';
import { useDatabase } from '@/hooks/useDatabase';
import { useNewGameStore } from '@/hooks/useNewGameStore';
import { deleteDeck, getDeck, upsertDeck } from '@/storage/deckRepo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Loader } from '@/ui/Loader';
import { Button } from '@/ui/Button';
import { CircleButton } from '@/ui/CircleButton';
import { cardTextOn } from '@/ui/contrast';
import { EmojiSticker } from '@/ui/EmojiSticker';
import { EmptyState } from '@/ui/EmptyState';
import { READABLE_WIDTH, useLayout } from '@/ui/layout';
import { Icon, type IconName } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { SectionLabel } from '@/ui/Section';
import { Tap } from '@/ui/Tap';
import { Text } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';
import { color, font, gutter, radius, space } from '@/ui/tokens';

type LoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; deck: StoredDeck };

export default function DeckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const database = useDatabase();
  const resetDraft = useNewGameStore((s) => s.reset);
  const toggleDeck = useNewGameStore((s) => s.toggleDeck);
  const insets = useSafeAreaInsets();
  const { short } = useLayout();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [busy, setBusy] = useState(false);

  // Reloads on focus so returning from the editor shows the saved deck.
  useFocusEffect(
    useCallback(() => {
      if (database.status !== 'ready' || !id) return;

      let cancelled = false;
      const { db } = database;

      void (async () => {
        const deck = await getDeck(db, id);
        if (cancelled) return;
        setState(deck ? { status: 'ready', deck } : { status: 'missing' });
      })();

      return () => {
        cancelled = true;
      };
    }, [database, id]),
  );

  const top = <TopBar leading="back" onLeading={router.back} leadingLabel="Back to decks" />;

  if (state.status === 'loading') {
    return (
      <Screen>
        {top}
        <Loader />
      </Screen>
    );
  }

  if (state.status === 'missing') {
    return (
      <Screen>
        {top}
        <EmptyState title="That deck is gone" body="It may have been deleted. Head back and pick another." mood="sad" />
      </Screen>
    );
  }

  const { deck } = state;
  const onAccent = cardTextOn(deck.accentColor);
  const playable = isPlayable(deck);
  const bundled = deck.source === 'bundled';

  const play = () => {
    resetDraft();
    toggleDeck(deck.id);
    router.push('/new/teams');
  };

  /**
   * Duplicating mints fresh card ids, which is what lets a bundled deck be
   * customised without the copy and the original marking each other's cards as
   * seen in a session holding both.
   */
  const duplicate = async () => {
    if (database.status !== 'ready' || busy) return;
    setBusy(true);

    try {
      const copy = duplicateDeck(deck, new Date().toISOString());
      await upsertDeck(database.db, copy, 'custom');
      router.replace(`/decks/edit/${copy.id}`);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      `Delete ${deck.name}?`,
      `${deck.cards.length} ${deck.cards.length === 1 ? 'card' : 'cards'} will go with it. This can’t be undone.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (database.status !== 'ready') return;
            void (async () => {
              await deleteDeck(database.db, deck.id);
              router.back();
            })();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={deck.cards}
        keyExtractor={(card) => card.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + space.xl, paddingLeft: insets.left, paddingRight: insets.right },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <View
              style={[
                styles.hero,
                short && styles.heroShort,
                { backgroundColor: deck.accentColor, paddingTop: insets.top + (short ? 56 : 64) },
              ]}
            >
              <Text style={styles.watermark} accessible={false} allowFontScaling={false}>
                {deck.emoji ?? DEFAULT_DECK_EMOJI}
              </Text>
              <EmojiSticker emoji={deck.emoji ?? DEFAULT_DECK_EMOJI} size={short ? 56 : 76} tilt={-8} />
              <Text style={[styles.title, short && styles.titleShort, { color: onAccent }]} numberOfLines={3} accessibilityRole="header">
                {deck.name}
              </Text>
              {deck.description ? (
                <Text style={[styles.description, { color: onAccent }]}>{deck.description}</Text>
              ) : null}
              <View style={styles.pills}>
                <Pill text={`${deck.cards.length} ${deck.cards.length === 1 ? 'card' : 'cards'}`} ink={onAccent} />
                {deck.author ? <Pill text={`by ${deck.author}`} ink={onAccent} /> : null}
                {bundled ? <Pill text="Free deck" ink={onAccent} /> : null}
              </View>
            </View>

            <View style={[styles.actions, short && styles.readable]}>
              {playable ? (
                <Button label="Play this deck" variant="primary" size="lg" icon="play" onPress={play} />
              ) : (
                <Text variant="body" tone="pass" align="center">
                  Add {MIN_PLAYABLE_CARDS - deck.cards.length} more{' '}
                  {MIN_PLAYABLE_CARDS - deck.cards.length === 1 ? 'card' : 'cards'} to play this deck.
                </Text>
              )}

              <View style={styles.row}>
                <Action icon="share" label="Share" onPress={() => router.push(`/decks/share/${deck.id}`)} />
                {bundled ? (
                  <Action icon="copy" label={busy ? 'Copying' : 'Copy & edit'} onPress={() => void duplicate()} />
                ) : (
                  <>
                    <Action icon="edit" label="Edit" onPress={() => router.push(`/decks/edit/${deck.id}`)} />
                    <Action icon="copy" label={busy ? 'Copying' : 'Duplicate'} onPress={() => void duplicate()} />
                    <Action icon="trash" label="Delete" danger onPress={confirmDelete} />
                  </>
                )}
              </View>

              {bundled ? (
                <Text variant="caption" tone="faint" align="center">
                  Free decks stay as they are so updates never wipe your changes. Copy one to make it yours.
                </Text>
              ) : null}
            </View>

            <SectionLabel>What’s inside</SectionLabel>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.cardRow}>
            <Text style={styles.cardIndex}>{index + 1}</Text>
            {item.image ? <Image source={{ uri: item.image }} style={styles.cardPhoto} accessible={false} /> : null}
            <View style={styles.cardBody}>
              <Text variant="heading">{item.text}</Text>
              {/* Notes are a clue-giver hint. They belong here and in the recap,
                  never on the card itself during a round. */}
              {item.note ? (
                <Text variant="caption" tone="muted">
                  {item.note}
                </Text>
              ) : null}
              {item.taboo ? (
                <Text variant="caption" tone="faint">
                  🚫 {item.taboo.join(' · ')}
                </Text>
              ) : null}
            </View>
          </View>
        )}
        ListEmptyComponent={<EmptyState title="This deck is empty" body="There are no cards in it yet." />}
      />

      <View style={[styles.floating, { top: insets.top + space.sm, left: insets.left + gutter - 4 }]}>
        <CircleButton icon="back" label="Back to decks" tone="scrim" onPress={router.back} />
      </View>
    </View>
  );
}

/** A round action with a label under it, the way a profile lays out its buttons. */
function Action({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Tap onPress={onPress} accessibilityLabel={label} style={styles.action} contentStyle={styles.actionInner}>
      <View style={styles.actionCircle}>
        <Icon name={icon} size={22} color={danger ? color.danger : color.text} weight={2.75} />
      </View>
      <Text variant="caption" style={{ color: danger ? color.danger : color.textMuted }}>
        {label}
      </Text>
    </Tap>
  );
}

function Pill({ text, ink }: { text: string; ink: string }) {
  return (
    <View style={[styles.pill, { borderColor: ink }]}>
      <Text variant="label" style={{ color: ink }}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  floating: { position: 'absolute', left: gutter - 4 },
  header: { gap: space.lg, paddingBottom: space.sm },
  hero: {
    paddingHorizontal: gutter + 4,
    paddingBottom: space.lg,
    gap: space.sm,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
    minHeight: 300,
    justifyContent: 'flex-end',
  },
  watermark: {
    position: 'absolute',
    right: -50,
    top: 20,
    fontSize: 230,
    lineHeight: 270,
    opacity: 0.2,
    transform: [{ rotate: '-14deg' }],
  },
  heroShort: { minHeight: 0, paddingBottom: space.md },
  title: { fontFamily: font.display, fontSize: 48, lineHeight: 50, letterSpacing: -1.8 },
  titleShort: { fontSize: 36, lineHeight: 38 },
  readable: { width: '100%', maxWidth: READABLE_WIDTH, alignSelf: 'center' },
  description: { fontFamily: font.bold, fontSize: 15, lineHeight: 21, opacity: 0.88 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingTop: space.xs },
  pill: { borderWidth: 2, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 3 },
  actions: { gap: space.md, paddingHorizontal: gutter },
  row: { flexDirection: 'row', justifyContent: 'center', gap: space.lg },
  action: { minWidth: 64 },
  actionInner: { alignItems: 'center', gap: 6 },
  actionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flexGrow: 1 },
  cardRow: {
    flexDirection: 'row',
    gap: space.md,
    marginHorizontal: gutter,
    paddingVertical: 12,
    alignItems: 'baseline',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
  cardIndex: { fontFamily: font.heavy, fontSize: 13, lineHeight: 18, color: color.textFaint, minWidth: 22, textAlign: 'right' },
  cardPhoto: { width: 44, height: 44, borderRadius: 10 },
  cardBody: { flex: 1, gap: 2 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
