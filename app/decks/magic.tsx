import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { appendCards, createDeck } from '@/decks/edit';
import { makeCardId } from '@/decks/ids';
import { MIN_PLAYABLE_CARDS } from '@/decks/types';
import { useDatabase } from '@/hooks/useDatabase';
import { useHaptics } from '@/hooks/useHaptics';
import { DeckMakerError, dreamUpCards } from '@/media/ai';
import { upsertDeck } from '@/storage/deckRepo';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { Icon } from '@/ui/Icon';
import { Mascot } from '@/ui/Mascot';
import { Footer, Screen } from '@/ui/Screen';
import { ChatLine } from '@/ui/Social';
import { Text } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';
import { color, deckColors, gutter, radius, space } from '@/ui/tokens';

const IDEAS = ['Our spring break trip', '2000s Disney Channel', 'Things in a dorm room', 'Famous duos', 'Iconic movie villains', 'Summer camp'];

/**
 * Dream up a deck.
 *
 * Type a theme and Apple's on-device model writes the cards, on the phone, in
 * a few seconds, with no internet. A small model gets things wrong, so the
 * cards come back as a list to prune before anything is saved, and "Write
 * more" adds another batch without repeats.
 */
export default function DeckMakerScreen() {
  const router = useRouter();
  const database = useDatabase();
  const haptics = useHaptics();

  const [theme, setTheme] = useState('');
  const [cards, setCards] = useState<string[]>([]);
  const [thinking, setThinking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dream = async (more: boolean) => {
    if (!theme.trim() || thinking) return;
    setThinking(true);
    setProblem(null);
    try {
      const fresh = await dreamUpCards(theme, more ? 20 : 30);
      setCards((current) => {
        const base = more ? current : [];
        const seen = new Set(base.map((c) => c.toLocaleLowerCase()));
        return [...base, ...fresh.filter((c) => !seen.has(c.toLocaleLowerCase()))];
      });
      haptics.correct();
    } catch (error) {
      setProblem(error instanceof DeckMakerError ? error.message : 'Something went wrong. Try again.');
    } finally {
      setThinking(false);
    }
  };

  const save = async () => {
    if (database.status !== 'ready' || saving || cards.length === 0) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const name = theme.trim().replace(/^\w/, (c) => c.toUpperCase()).slice(0, 60);
      const accent = deckColors[cards.length % deckColors.length]!;
      const deck = appendCards(
        { ...createDeck({ now, name, accentColor: accent }), description: 'Dreamed up on this iPhone.', tags: ['ai'] },
        cards.map((text) => ({ id: makeCardId(), text, note: null })),
        now,
      );
      await upsertDeck(database.db, deck, 'custom');
      haptics.correct();
      router.replace(`/decks/${deck.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <TopBar leading="close" onLeading={router.back} title="Dream one up" />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.hello}>
            <Mascot size={72} mood={thinking ? 'thinking' : 'excited'} glyph="✨" />
            <ChatLine style={styles.grow}>
              <Text variant="heading">{thinking ? 'Writing it on your iPhone…' : 'Give me a theme.'}</Text>
              <Text variant="caption" tone="muted">
                Apple Intelligence writes the cards right here, offline. Nothing you type leaves this phone.
              </Text>
            </ChatLine>
          </View>

          <Field
            value={theme}
            onChangeText={setTheme}
            placeholder="Our spring break trip"
            accessibilityLabel="Deck theme"
            size="heading"
            maxLength={80}
            returnKeyType="go"
            onSubmitEditing={() => void dream(false)}
          />

          {cards.length === 0 ? (
            <View style={styles.ideas}>
              {IDEAS.map((idea) => (
                <Chip key={idea} label={idea} selected={false} onPress={() => setTheme(idea)} />
              ))}
            </View>
          ) : null}

          {problem ? (
            <Text variant="label" tone="pass">
              {problem}
            </Text>
          ) : null}

          {cards.length > 0 ? (
            <View style={styles.cards}>
              <Text variant="overline" tone="faint">
                {cards.length} CARDS · TAP ✕ TO DROP ONE
              </Text>
              <View style={styles.wrap}>
                {cards.map((card) => (
                  <View key={card} style={styles.card}>
                    <Text variant="label" numberOfLines={1} style={styles.shrink}>
                      {card}
                    </Text>
                    <Pressable
                      onPress={() => setCards((all) => all.filter((c) => c !== card))}
                      accessibilityRole="button"
                      accessibilityLabel={`Drop ${card}`}
                      hitSlop={8}
                    >
                      <Icon name="close" size={14} color={color.textMuted} weight={3} />
                    </Pressable>
                  </View>
                ))}
              </View>
              <Button label={thinking ? 'Writing…' : 'Write more'} icon="plus" size="sm" disabled={thinking} onPress={() => void dream(true)} />
            </View>
          ) : null}
        </ScrollView>

        <Footer>
          {cards.length === 0 ? (
            <Button
              label={thinking ? 'Writing…' : 'Dream it up'}
              variant="primary"
              size="lg"
              icon="bolt"
              disabled={thinking || !theme.trim()}
              onPress={() => void dream(false)}
            />
          ) : (
            <>
              <Button
                label={saving ? 'Saving…' : cards.length < MIN_PLAYABLE_CARDS ? `Save (${MIN_PLAYABLE_CARDS - cards.length} short of playable)` : 'Save the deck'}
                variant="primary"
                size="lg"
                icon="check"
                disabled={saving}
                onPress={() => void save()}
              />
              <Button label="Start over" variant="ghost" onPress={() => setCards([])} />
            </>
          )}
        </Footer>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { paddingHorizontal: gutter, paddingBottom: space.lg, gap: space.md },
  hello: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  grow: { flex: 1 },
  ideas: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cards: { gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    maxWidth: '100%',
    paddingHorizontal: space.sm + 4,
    paddingVertical: space.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 2,
    borderColor: color.line,
  },
  shrink: { flexShrink: 1 },
});
