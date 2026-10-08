import { useMemo } from 'react';
import { Text as RNText, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DeckSummary } from '@/decks/types';
import { Loader } from '@/ui/Loader';
import { CircleButton } from '@/ui/CircleButton';
import { DeckCard } from '@/ui/DeckCard';
import { EmptyState } from '@/ui/EmptyState';
import { Icon } from '@/ui/Icon';
import { useLayout } from '@/ui/layout';
import { SearchField } from '@/ui/SearchField';
import { SectionLabel } from '@/ui/Section';
import { Tap } from '@/ui/Tap';
import { Text } from '@/ui/Text';
import { color, gutter, radius, space } from '@/ui/tokens';

export type DecksPageProps = {
  decks: DeckSummary[] | null;
  error?: string;
  query: string;
  onQuery: (query: string) => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onImport: () => void;
  /** The "deck about your group" builder. */
  onGroup: () => void;
  /** The on-device AI deck maker, when this phone can run it. */
  bottomInset: number;
};

const GAP = 12;

/** The narrowest a cover tile gets before the grid drops a column. */
const MIN_TILE = 160;

/** How many tiles across: two upright, three or four on a phone on its side. */
export function gridColumns(available: number): number {
  return Math.max(2, Math.floor((available + GAP) / (MIN_TILE + GAP)));
}

/**
 * Every deck, as a feed of cover tiles, two across upright and more sideways. Yours first — the decks you
 * made are the reason the app is worth keeping — then the free ones.
 */
export function DecksPage({ decks, error, query, onQuery, onOpen, onNew, onImport, onGroup, bottomInset }: DecksPageProps) {
  const { width, short } = useLayout();
  const insets = useSafeAreaInsets();
  const available = width - insets.left - insets.right - gutter * 2;
  const columns = gridColumns(available);
  const tile = Math.floor((available - GAP * (columns - 1)) / columns);
  const sides = { paddingLeft: insets.left, paddingRight: insets.right };
  const searching = query.trim().length > 0;

  const { mine, bundled } = useMemo(
    () => ({
      mine: (decks ?? []).filter((d) => d.source === 'custom'),
      bundled: (decks ?? []).filter((d) => d.source === 'bundled'),
    }),
    [decks],
  );

  return (
    <View style={[styles.page, sides, { width, paddingTop: insets.top }]}>
      {/* Sideways, the search moves up into the title row to save height. */}
      <View style={[styles.header, short && styles.headerShort]}>
        <Text variant={short ? 'display' : 'hero'} accessibilityRole="header">
          Decks
        </Text>
        {short ? (
          <View style={styles.inlineSearch}>
            <SearchField value={query} onChangeText={onQuery} />
          </View>
        ) : null}
        <View style={styles.actions}>
          <CircleButton icon="download" label="Import a deck" onPress={onImport} />
          <CircleButton icon="plus" label="New deck" tone="brand" onPress={onNew} />
        </View>
      </View>

      {short ? null : <SearchField value={query} onChangeText={onQuery} />}

      {error ? (
        <EmptyState title="Couldn’t open your decks" body={error} mood="sad" />
      ) : !decks ? (
        <Loader />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: bottomInset + space.lg }]}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {searching && decks.length === 0 ? (
            <EmptyState title="Nothing matches that" body={`No deck or card mentions “${query.trim()}”.`} />
          ) : null}

          {!searching || mine.length > 0 ? (
            <View>
              <SectionLabel>Yours</SectionLabel>
              <View style={styles.grid}>
                {mine.map((deck) => (
                  <DeckCard key={deck.id} deck={deck} onPress={() => onOpen(deck.id)} style={{ width: tile }} />
                ))}
                {searching ? null : (
                  <Tap onPress={onNew} accessibilityLabel="Make a deck" style={{ width: tile }} contentStyle={styles.newTile}>
                    <View style={styles.plus}>
                      <Icon name="plus" size={28} color={color.ink} weight={3.5} />
                    </View>
                    <Text variant="heading" align="center">
                      Make a deck
                    </Text>
                    <Text variant="caption" tone="muted" align="center">
                      Type cards, paste a list or add photos
                    </Text>
                  </Tap>
                )}
                {searching ? null : (
                  <Tap onPress={onGroup} accessibilityLabel="Make a deck about your group" style={{ width: tile }} contentStyle={styles.newTile}>
                    <RNText style={styles.tileEmoji}>👯</RNText>
                    <Text variant="heading" align="center">
                      About your group
                    </Text>
                    <Text variant="caption" tone="muted" align="center">
                      Answer five questions, get a deck only you can play
                    </Text>
                  </Tap>
                )}
              </View>
            </View>
          ) : null}

          {bundled.length > 0 ? (
            <View>
              <SectionLabel>Free decks</SectionLabel>
              <View style={styles.grid}>
                {bundled.map((deck) => (
                  <DeckCard key={deck.id} deck={deck} onPress={() => onOpen(deck.id)} style={{ width: tile }} />
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    paddingTop: space.sm,
    paddingBottom: space.md,
  },
  headerShort: { paddingTop: space.xs, paddingBottom: space.xs, gap: space.md },
  inlineSearch: { flex: 1, marginHorizontal: -gutter },
  actions: { flexDirection: 'row', gap: space.sm },
  body: { paddingTop: space.lg, gap: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: gutter },
  tileEmoji: { fontSize: 34, lineHeight: 42 },
  newTile: {
    aspectRatio: 0.78,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.md,
    gap: space.sm,
  },
  plus: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
