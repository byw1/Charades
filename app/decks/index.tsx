import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, SectionList, StyleSheet, View } from 'react-native';
import type { DeckSummary } from '@/decks/types';
import { useDatabase } from '@/hooks/useDatabase';
import { listDeckSummaries, searchDeckSummaries } from '@/storage/deckRepo';
import { Button } from '@/ui/Button';
import { DeckCard } from '@/ui/DeckCard';
import { EmptyState } from '@/ui/EmptyState';
import { Icon } from '@/ui/Icon';
import { Raised } from '@/ui/Raised';
import { Footer, Screen } from '@/ui/Screen';
import { SearchField } from '@/ui/SearchField';
import { SectionLabel } from '@/ui/Section';
import { Text } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';
import { color, radius, space } from '@/ui/tokens';

export default function DecksScreen() {
  const router = useRouter();
  const database = useDatabase();
  const [query, setQuery] = useState('');
  const [decks, setDecks] = useState<DeckSummary[] | null>(null);

  // Reloads on focus as well as on query change, so a deck edited or deleted
  // is current when the browser comes back rather than showing a stale count
  // until the app restarts.
  useFocusEffect(
    useCallback(() => {
      if (database.status !== 'ready') return;

      let cancelled = false;
      const { db } = database;

      void (async () => {
        const results = query.trim() ? await searchDeckSummaries(db, query) : await listDeckSummaries(db);
        if (!cancelled) setDecks(results);
      })();

      return () => {
        cancelled = true;
      };
    }, [database, query]),
  );

  const sections = useMemo(() => {
    if (!decks) return [];
    const bundled = decks.filter((d) => d.source === 'bundled');
    const custom = decks.filter((d) => d.source === 'custom');

    return [
      // Shown even when empty, so the invitation to make one has a home.
      { title: 'Your decks', data: custom },
      ...(bundled.length ? [{ title: 'Included free', data: bundled }] : []),
    ];
  }, [decks]);

  const top = <TopBar leading="back" onLeading={router.back} title="Decks" />;

  if (database.status === 'error') {
    return (
      <Screen>
        {top}
        <EmptyState title="Couldn’t open your decks" body={database.message} mood="sad" />
      </Screen>
    );
  }

  if (database.status === 'loading' || !decks) {
    return (
      <Screen>
        {top}
        <View style={styles.centre}>
          <ActivityIndicator color={color.brand} size="large" />
        </View>
      </Screen>
    );
  }

  const searching = query.trim().length > 0;

  return (
    <Screen>
      {top}
      <SearchField value={query} onChangeText={setQuery} />

      <SectionList
        sections={searching ? sections.filter((s) => s.data.length > 0) : sections}
        keyExtractor={(deck) => deck.id}
        renderItem={({ item }) => <DeckCard deck={item} onPress={() => router.push(`/decks/${item.id}`)} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <SectionLabel>{section.title}</SectionLabel>
          </View>
        )}
        renderSectionFooter={({ section }) =>
          section.title === 'Your decks' && section.data.length === 0 && !searching ? (
            <Raised
              face={color.background}
              shade={color.line}
              border={color.line}
              radius={radius.lg}
              onPress={() => router.push('/decks/edit/new')}
              accessibilityLabel="Make your own deck"
              style={styles.invite}
              faceStyle={styles.inviteFace}
            >
              <View style={styles.inviteIcon}>
                <Icon name="plus" size={26} color={color.bone} weight={3.5} />
              </View>
              <View style={styles.inviteBody}>
                <Text variant="heading">Make your own deck</Text>
                <Text variant="caption" tone="muted">
                  Inside jokes, your friends’ names, anything the group would shout at each other.
                </Text>
              </View>
            </Raised>
          ) : null
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          <EmptyState
            title={searching ? 'Nothing matches that' : 'No decks yet'}
            body={
              searching
                ? `No deck or card mentions “${query.trim()}”. Try something shorter.`
                : 'Deckhead comes with five decks. If none are showing, something went wrong opening them.'
            }
          />
        }
      />

      <Footer>
        <View style={styles.row}>
          <Button label="New deck" variant="primary" icon="plus" onPress={() => router.push('/decks/edit/new')} style={styles.grow} />
          <Button label="Import" icon="download" onPress={() => router.push('/decks/import')} style={styles.grow} />
        </View>
      </Footer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: space.sm, paddingBottom: space.md, flexGrow: 1 },
  sectionHeader: { paddingTop: space.md },
  invite: { marginHorizontal: 20, marginBottom: space.sm },
  inviteFace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderStyle: 'dashed',
  },
  inviteIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: color.correct,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBody: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', gap: space.sm + 4 },
  grow: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
