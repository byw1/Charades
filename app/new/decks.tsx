import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { MIN_PLAYABLE_CARDS, summaryIsPlayable, type DeckSummary } from '@/decks/types';
import { useDatabase } from '@/hooks/useDatabase';
import { useHaptics } from '@/hooks/useHaptics';
import { useNewGameStore } from '@/hooks/useNewGameStore';
import { listDeckSummaries } from '@/storage/deckRepo';
import { Button } from '@/ui/Button';
import { DeckStack } from '@/ui/DeckCard';
import { EmptyState } from '@/ui/EmptyState';
import { Icon } from '@/ui/Icon';
import { Raised } from '@/ui/Raised';
import { Footer, Screen } from '@/ui/Screen';
import { StepHeader } from '@/ui/StepHeader';
import { Text } from '@/ui/Text';
import { color, radius, space } from '@/ui/tokens';

/** Step one of three: which decks are in play. */
export default function NewGameDecksScreen() {
  const router = useRouter();
  const database = useDatabase();
  const haptics = useHaptics();

  const deckIds = useNewGameStore((s) => s.deckIds);
  const toggleDeck = useNewGameStore((s) => s.toggleDeck);

  const [decks, setDecks] = useState<DeckSummary[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (database.status !== 'ready') return;

      let cancelled = false;
      const { db } = database;

      void (async () => {
        const all = await listDeckSummaries(db);
        if (!cancelled) setDecks(all);
      })();

      return () => {
        cancelled = true;
      };
    }, [database]),
  );

  const totalCards = (decks ?? [])
    .filter((d) => deckIds.includes(d.id))
    .reduce((sum, d) => sum + d.cardCount, 0);

  const enough = totalCards >= MIN_PLAYABLE_CARDS;

  const header = (
    <StepHeader
      step={1}
      of={3}
      title="Which decks are we playing?"
      subtitle="Pick one, or mix a few together."
      onClose={router.back}
    />
  );

  if (database.status === 'error') {
    return (
      <Screen>
        {header}
        <EmptyState title="Couldn’t open your decks" body={database.message} mood="sad" />
      </Screen>
    );
  }

  if (!decks) {
    return (
      <Screen>
        {header}
        <View style={styles.centre}>
          <ActivityIndicator color={color.brand} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {header}

      <FlatList
        data={decks}
        keyExtractor={(deck) => deck.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const selected = deckIds.includes(item.id);
          const playable = summaryIsPlayable(item);

          return (
            <Raised
              face={selected ? color.focusLight : color.background}
              shade={selected ? color.focus : color.line}
              border={selected ? color.focus : color.line}
              radius={radius.lg}
              onPress={() => toggleDeck(item.id)}
              onPressIn={() => haptics.select()}
              disabled={!playable}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected, disabled: !playable }}
              accessibilityLabel={`${item.name}, ${item.cardCount} cards`}
              style={[styles.tile, !playable && styles.disabled]}
              faceStyle={styles.tileFace}
            >
              <DeckStack accent={item.accentColor} initial={[...item.name][0]?.toUpperCase() ?? '?'} size={48} />
              <View style={styles.tileBody}>
                <Text variant="heading" numberOfLines={1} style={selected ? { color: color.focus } : null}>
                  {item.name}
                </Text>
                <Text variant="caption" tone="faint">
                  {item.cardCount} cards{playable ? '' : ' · too few to play'}
                </Text>
              </View>
              <View style={[styles.check, selected && styles.checkOn]}>
                {selected ? <Icon name="check" size={18} color={color.bone} weight={3.5} /> : null}
              </View>
            </Raised>
          );
        }}
        ListEmptyComponent={
          <EmptyState title="No decks yet" body="Something went wrong opening the bundled decks." mood="sad" />
        }
      />

      <Footer>
        <Button
          label={
            deckIds.length === 0
              ? 'Pick a deck'
              : !enough
                ? `${MIN_PLAYABLE_CARDS} cards needed`
                : `Continue · ${totalCards} cards`
          }
          variant="primary"
          size="lg"
          disabled={!enough}
          onPress={() => router.push('/new/teams')}
        />
      </Footer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: space.xs, paddingBottom: space.md, flexGrow: 1 },
  tile: { marginHorizontal: 20, marginBottom: space.sm + 4 },
  tileFace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm + 4,
    paddingHorizontal: space.md,
  },
  tileBody: { flex: 1, gap: 2 },
  disabled: { opacity: 0.45 },
  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2.5,
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: color.focus, borderColor: color.focus },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
