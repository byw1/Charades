import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { makeCardId } from '@/decks/ids';
import { DEFAULT_DECK_EMOJI, type Card, type StoredDeck } from '@/decks/types';
import { useDatabase } from '@/hooks/useDatabase';
import { useHaptics } from '@/hooks/useHaptics';
import { saveDeckChanges } from '@/storage/deckRepo';
import { Button } from '@/ui/Button';
import { cardTextOn } from '@/ui/contrast';
import { EmojiSticker } from '@/ui/EmojiSticker';
import { Field } from '@/ui/Field';
import { Icon } from '@/ui/Icon';
import { Footer, Screen } from '@/ui/Screen';
import { SearchField } from '@/ui/SearchField';
import { Tap } from '@/ui/Tap';
import { Text } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';
import { color, font, gutter, radius, space } from '@/ui/tokens';

type Row = { kind: 'deck'; card: Card } | { kind: 'mine'; card: Card };

/**
 * Making a free deck yours, without copying it.
 *
 * Its own cards can be hidden (and brought back), and you can add cards of
 * your own, which are marked as yours everywhere. The deck's name and its
 * cards' words stay as they are, so app updates can keep improving them
 * underneath your changes. For full control, there is still Copy.
 */
export function FreeDeckEditor({ deck }: { deck: StoredDeck }) {
  const router = useRouter();
  const database = useDatabase();
  const haptics = useHaptics();

  const own = useMemo(() => deck.cards.filter((card) => !card.mine), [deck]);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(
    () => new Set(deck.cards.filter((card) => card.hidden).map((card) => card.id)),
  );
  const [mine, setMine] = useState<Card[]>(() => deck.cards.filter((card) => card.mine));
  const [newCard, setNewCard] = useState('');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const onAccent = cardTextOn(deck.accentColor);
  const showing = own.length - hidden.size + mine.length;

  const toggle = (id: string) => {
    haptics.select();
    setDirty(true);
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const add = () => {
    const text = newCard.trim();
    if (!text) return;
    haptics.correct();
    setDirty(true);
    setMine((current) => [...current, { id: makeCardId(), text, note: null, mine: true }]);
    setNewCard('');
  };

  const editMine = (id: string, text: string) => {
    setDirty(true);
    setMine((current) => current.map((card) => (card.id === id ? { ...card, text } : card)));
  };

  const removeMine = (id: string) => {
    setDirty(true);
    setMine((current) => current.filter((card) => card.id !== id));
  };

  const save = async () => {
    if (database.status !== 'ready' || saving) return;
    setSaving(true);
    try {
      await saveDeckChanges(database.db, deck.id, {
        hidden: [...hidden],
        mine: mine.filter((card) => card.text.trim()).map((card) => ({ ...card, text: card.text.trim() })),
      });
      haptics.correct();
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const leave = () => {
    if (!dirty) return router.back();
    Alert.alert('Leave without saving?', 'Your changes to this deck will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const resetAll = () =>
    Alert.alert('Back to the original?', 'Every hidden card comes back and the cards you added are removed.', [
      { text: 'Keep mine', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          setHidden(new Set());
          setMine([]);
          setDirty(true);
        },
      },
    ]);

  const needle = query.trim().toLowerCase();
  const rows: Row[] = [
    ...mine.map((card) => ({ kind: 'mine' as const, card })),
    ...own.filter((card) => !needle || card.text.toLowerCase().includes(needle)).map((card) => ({ kind: 'deck' as const, card })),
  ];

  return (
    <Screen>
      <TopBar leading="close" onLeading={leave} leadingLabel="Close" title="Make it yours" />

      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={rows}
          keyExtractor={(row) => `${row.kind}-${row.card.id}`}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={[styles.banner, { backgroundColor: deck.accentColor }]}>
                <EmojiSticker emoji={deck.emoji ?? DEFAULT_DECK_EMOJI} size={56} />
                <View style={styles.grow}>
                  <Text variant="title" style={{ color: onAccent }} numberOfLines={2}>
                    {deck.name}
                  </Text>
                  <Text variant="caption" style={{ color: onAccent, opacity: 0.9 }}>
                    {showing} cards in play · {mine.length} yours · {hidden.size} hidden
                  </Text>
                </View>
              </View>

              <Text variant="caption" tone="muted">
                Hide cards you don’t want, add your own. Your changes stay when the app updates this deck.
              </Text>

              <Text variant="overline" tone="faint">
                ADD YOUR OWN
              </Text>
              <View style={styles.addRow}>
                <Field
                  value={newCard}
                  onChangeText={setNewCard}
                  onSubmitEditing={add}
                  placeholder="Type a card and hit return"
                  accessibilityLabel="New card"
                  returnKeyType="done"
                  submitBehavior="submit"
                  style={styles.grow}
                />
                <Tap
                  onPress={add}
                  disabled={!newCard.trim()}
                  accessibilityLabel="Add card"
                  contentStyle={[styles.addButton, { backgroundColor: newCard.trim() ? color.brand : color.surface }]}
                >
                  <Icon name="plus" size={24} color={newCard.trim() ? color.ink : color.textFaint} weight={3.5} />
                </Tap>
              </View>

              <Text variant="overline" tone="faint">
                CARDS · TAP THE EYE TO HIDE ONE
              </Text>
              <View style={styles.search}>
                <SearchField value={query} onChangeText={setQuery} placeholder={`Search ${own.length} cards`} />
              </View>
            </View>
          }
          renderItem={({ item }) =>
            item.kind === 'mine' ? (
              <View style={styles.row}>
                <View style={styles.yours}>
                  <Text style={styles.yoursText}>YOURS</Text>
                </View>
                <Field
                  value={item.card.text}
                  onChangeText={(text) => editMine(item.card.id, text)}
                  accessibilityLabel="Your card"
                  style={styles.grow}
                />
                <Pressable onPress={() => removeMine(item.card.id)} accessibilityRole="button" accessibilityLabel={`Delete ${item.card.text}`} hitSlop={8}>
                  <Icon name="trash" size={20} color={color.danger} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => toggle(item.card.id)}
                accessibilityRole="switch"
                accessibilityState={{ checked: !hidden.has(item.card.id) }}
                accessibilityLabel={`${item.card.text}, ${hidden.has(item.card.id) ? 'hidden' : 'in play'}`}
                style={styles.row}
              >
                <Text
                  variant="heading"
                  style={[styles.grow, hidden.has(item.card.id) && styles.hiddenText]}
                  numberOfLines={2}
                >
                  {item.card.text}
                </Text>
                <Icon
                  name={hidden.has(item.card.id) ? 'eyeOff' : 'eye'}
                  size={22}
                  color={hidden.has(item.card.id) ? color.textFaint : color.text}
                />
              </Pressable>
            )
          }
          ListFooterComponent={
            hidden.size > 0 || mine.length > 0 ? (
              <Pressable onPress={resetAll} accessibilityRole="button" style={styles.reset}>
                <Text variant="label" tone="muted" align="center">
                  Reset to the original deck
                </Text>
              </Pressable>
            ) : null
          }
        />

        <Footer>
          <Button
            label={saving ? 'Saving…' : 'Save changes'}
            variant="primary"
            size="lg"
            icon="check"
            disabled={saving || !dirty}
            onPress={() => void save()}
          />
        </Footer>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  grow: { flex: 1 },
  list: { paddingBottom: space.lg },
  header: { gap: space.sm, paddingHorizontal: gutter, paddingBottom: space.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
  },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  addButton: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  search: { marginHorizontal: -gutter },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: gutter,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
  hiddenText: { color: color.textFaint, textDecorationLine: 'line-through' },
  yours: { backgroundColor: color.brand, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  yoursText: { fontFamily: font.heavy, fontSize: 10, lineHeight: 14, color: color.ink, letterSpacing: 0.6 },
  reset: { paddingVertical: space.lg },
});
