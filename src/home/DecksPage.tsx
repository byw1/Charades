import { useMemo } from 'react';
import { ActivityIndicator, Text as RNText, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DeckSummary } from '@/decks/types';
import { CircleButton } from '@/ui/CircleButton';
import { DeckCard } from '@/ui/DeckCard';
import { EmptyState } from '@/ui/EmptyState';
import { Icon } from '@/ui/Icon';
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
  onMagic?: () => void;
  bottomInset: number;
};

const GAP = 12;

/**
 * Every deck, as a feed of cover tiles two across. Yours first — the decks you
 * made are the reason the app is worth keeping — then the free ones.
 */
export function DecksPage({ decks, error, query, onQuery, onOpen, onNew, onImport, onGroup, onMagic, bottomInset }: DecksPageProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tile = (width - gutter * 2 - GAP) / 2;
  const searching = query.trim().length > 0;

  const { mine, bundled } = useMemo(
    () => ({
      mine: (decks ?? []).filter((d) => d.source === 'custom'),
      bundled: (decks ?? []).filter((d) => d.source === 'bundled'),
    }),
    [decks],
  );

  return (
    <View style={[styles.page, { width, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="hero" accessibilityRole="header">
          Decks
        </Text>
        <View style={styles.actions}>
          <CircleButton icon="download" label="Import a deck" onPress={onImport} />
          <CircleButton icon="plus" label="New deck" tone="brand" onPress={onNew} />
        </View>
      </View>

      <SearchField value={query} onChangeText={onQuery} />

      {error ? (
        <EmptyState title="Couldn’t open your decks" body={error} mood="sad" />
      ) : !decks ? (
        <View style={styles.centre}>
          <ActivityIndicator color={color.brand} size="large" />
        </View>
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
                {searching || !onMagic ? null : (
                  <Tap onPress={onMagic} accessibilityLabel="Make a deck with on-device AI" style={{ width: tile }} contentStyle={styles.newTile}>
                    <RNText style={styles.tileEmoji}>✨</RNText>
                    <Text variant="heading" align="center">
                      Dream one up
                    </Text>
                    <Text variant="caption" tone="muted" align="center">
                      Type a theme. Apple Intelligence writes it, on this phone
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
