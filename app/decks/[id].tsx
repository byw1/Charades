import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';
import { duplicateDeck } from '@/decks/edit';
import { isPlayable, MIN_PLAYABLE_CARDS, type StoredDeck } from '@/decks/types';
import { useDatabase } from '@/hooks/useDatabase';
import { useNewGameStore } from '@/hooks/useNewGameStore';
import { deleteDeck, getDeck, upsertDeck } from '@/storage/deckRepo';
import { Button } from '@/ui/Button';
import { cardTextOn, darken } from '@/ui/contrast';
import { EmptyState } from '@/ui/EmptyState';
import { PopIn } from '@/ui/motion';
import { Raised } from '@/ui/Raised';
import { Screen } from '@/ui/Screen';
import { SectionLabel } from '@/ui/Section';
import { Text } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';
import { color, radius, space } from '@/ui/tokens';

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
        <View style={styles.centre}>
          <ActivityIndicator color={color.brand} size="large" />
        </View>
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
    <Screen edges={['top']}>
      {top}

      <FlatList
        data={deck.cards}
        keyExtractor={(card) => card.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <PopIn>
              <Raised
                face={deck.accentColor}
                shade={darken(deck.accentColor)}
                radius={radius.xl}
                ledge={6}
                style={styles.bannerOuter}
                faceStyle={styles.banner}
              >
                <View style={styles.bannerBlob} />
                <Text variant="hero" style={{ color: onAccent }} numberOfLines={3}>
                  {deck.name}
                </Text>
                {deck.description ? (
                  <Text variant="body" style={[styles.bannerBody, { color: onAccent }]}>
                    {deck.description}
                  </Text>
                ) : null}
                <View style={styles.pills}>
                  <Pill text={`${deck.cards.length} ${deck.cards.length === 1 ? 'card' : 'cards'}`} ink={onAccent} />
                  {deck.author ? <Pill text={`by ${deck.author}`} ink={onAccent} /> : null}
                  {bundled ? <Pill text="Included free" ink={onAccent} /> : null}
                </View>
              </Raised>
            </PopIn>

            <View style={styles.actions}>
              {playable ? (
                <Button label="Play this deck" variant="primary" size="lg" icon="play" onPress={play} />
              ) : (
                <Text variant="body" tone="pass" align="center">
                  Add {MIN_PLAYABLE_CARDS - deck.cards.length} more{' '}
                  {MIN_PLAYABLE_CARDS - deck.cards.length === 1 ? 'card' : 'cards'} to play this deck.
                </Text>
              )}

              <View style={styles.row}>
                <Button
                  label="Share"
                  variant="blue"
                  icon="share"
                  onPress={() => router.push(`/decks/share/${deck.id}`)}
                  style={styles.grow}
                />
                {bundled ? (
                  <Button
                    label={busy ? 'Copying' : 'Copy & edit'}
                    icon="copy"
                    disabled={busy}
                    onPress={() => void duplicate()}
                    accessibilityHint="Makes an editable copy of this deck"
                    style={styles.grow}
                  />
                ) : (
                  <Button
                    label="Edit"
                    icon="edit"
                    onPress={() => router.push(`/decks/edit/${deck.id}`)}
                    style={styles.grow}
                  />
                )}
              </View>

              {bundled ? (
                <Text variant="caption" tone="faint" align="center">
                  Included decks stay as they are, so updates never overwrite your work. Copy one to make it yours.
                </Text>
              ) : (
                <View style={styles.row}>
                  <Button
                    label={busy ? 'Copying' : 'Duplicate'}
                    icon="copy"
                    size="sm"
                    disabled={busy}
                    onPress={() => void duplicate()}
                    style={styles.grow}
                  />
                  <Button label="Delete" icon="trash" size="sm" onPress={confirmDelete} style={styles.grow} />
                </View>
              )}
            </View>

            <SectionLabel>What’s inside</SectionLabel>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={[styles.cardRow, index === 0 && styles.cardRowFirst, index === deck.cards.length - 1 && styles.cardRowLast]}>
            <Text variant="label" tone="faint" style={styles.cardIndex}>
              {index + 1}
            </Text>
            <View style={styles.cardBody}>
              <Text variant="heading">{item.text}</Text>
              {/* Notes are a clue-giver hint. They belong here and in the recap,
                  never on the card itself during a round. */}
              {item.note ? (
                <Text variant="caption" tone="muted">
                  {item.note}
                </Text>
              ) : null}
            </View>
          </View>
        )}
        ListEmptyComponent={<EmptyState title="This deck is empty" body="There are no cards in it yet." />}
      />
    </Screen>
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
  header: { gap: space.lg, paddingBottom: space.sm },
  bannerOuter: { marginHorizontal: 20 },
  banner: {
    minHeight: 180,
    justifyContent: 'flex-end',
    padding: space.lg,
    gap: space.sm,
  },
  bannerBlob: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -60,
    top: -80,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  bannerBody: { opacity: 0.9 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingTop: space.xs },
  pill: {
    borderWidth: 2,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm + 4,
    paddingVertical: 3,
    opacity: 0.9,
  },
  actions: { gap: space.sm + 4, paddingHorizontal: 20 },
  row: { flexDirection: 'row', gap: space.sm + 4 },
  grow: { flex: 1 },
  list: { paddingBottom: space.xxl, flexGrow: 1 },
  cardRow: {
    flexDirection: 'row',
    gap: space.md,
    marginHorizontal: 20,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 4,
    alignItems: 'baseline',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: color.line,
  },
  cardRowFirst: { borderTopWidth: 2, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  cardRowLast: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  cardIndex: { minWidth: 24, textAlign: 'right' },
  cardBody: { flex: 1, gap: 2 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
