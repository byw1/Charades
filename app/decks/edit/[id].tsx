import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { createDeck, parseTabooInput } from '@/decks/edit';
import { CARD_TEXT_SOFT_CAP, DECK_EMOJI_CHOICES, DEFAULT_DECK_EMOJI, MIN_PLAYABLE_CARDS, type Deck } from '@/decks/types';
import { useDatabase } from '@/hooks/useDatabase';
import { useDeckEditor } from '@/hooks/useDeckEditor';
import { useHaptics } from '@/hooks/useHaptics';
import { pickPhotos, takePhoto } from '@/media/photos';
import { getDeck, upsertDeck } from '@/storage/deckRepo';
import { Button } from '@/ui/Button';
import { cardTextOn } from '@/ui/contrast';
import { EmojiSticker } from '@/ui/EmojiSticker';
import { EmptyState } from '@/ui/EmptyState';
import { Field } from '@/ui/Field';
import { Icon, type IconName } from '@/ui/Icon';
import { ProgressBar } from '@/ui/ProgressBar';
import { Tap } from '@/ui/Tap';
import { Footer, Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';
import { color, deckColors, gutter, radius, space } from '@/ui/tokens';

export default function DeckEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const database = useDatabase();

  const isNew = id === 'new';

  // A new deck exists from the first render, so there is nothing to load and
  // no effect to run for it.
  const [loaded, setLoaded] = useState<Deck | null>(() =>
    id === 'new' ? createDeck({ now: new Date().toISOString() }) : null,
  );
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (isNew || database.status !== 'ready' || !id) return;

    let cancelled = false;

    void (async () => {
      const deck = await getDeck(database.db, id);
      if (cancelled) return;
      if (deck) setLoaded(deck);
      else setMissing(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [database, id, isNew]);

  if (missing) {
    return (
      <Screen>
        <TopBar leading="close" onLeading={router.back} />
        <EmptyState title="That deck is gone" body="It may have been deleted." mood="sad" />
      </Screen>
    );
  }

  if (!loaded) {
    return (
      <Screen>
        <TopBar leading="close" onLeading={router.back} />
        <View style={styles.centre}>
          <ActivityIndicator color={color.brand} size="large" />
        </View>
      </Screen>
    );
  }

  return <Editor initial={loaded} isNew={isNew} />;
}

function Editor({ initial, isNew }: { initial: Deck; isNew: boolean }) {
  const router = useRouter();
  const database = useDatabase();
  const haptics = useHaptics();
  const editor = useDeckEditor(initial);

  const [newCard, setNewCard] = useState('');
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [tabooOpen, setTabooOpen] = useState<ReadonlySet<string>>(() => new Set());
  const [busyPhoto, setBusyPhoto] = useState(false);

  const { draft } = editor;

  const withPhotoBusy = async (task: () => Promise<void>) => {
    if (busyPhoto) return;
    setBusyPhoto(true);
    try {
      await task();
    } finally {
      setBusyPhoto(false);
    }
  };

  const addPhotoCards = () =>
    withPhotoBusy(async () => {
      const photos = await pickPhotos({ multiple: true });
      if (photos.length === 0) return;
      editor.addPhotoCards(photos);
      haptics.correct();
      Alert.alert(
        photos.length === 1 ? 'Photo added' : `${photos.length} photos added`,
        'Give each one a name: that’s what the room has to get the guesser to say.',
      );
    });

  const photoFor = (cardId: string, hasPhoto: boolean) => {
    const set = (source: 'library' | 'camera') =>
      void withPhotoBusy(async () => {
        const image = source === 'camera' ? await takePhoto() : (await pickPhotos())[0];
        if (image) editor.updateCard(cardId, { image });
      });

    Alert.alert(hasPhoto ? 'Card photo' : 'Add a photo', undefined, [
      { text: 'Choose from library', onPress: () => set('library') },
      { text: 'Take a photo', onPress: () => set('camera') },
      ...(hasPhoto
        ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: () => editor.updateCard(cardId, { image: null }) }]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const toggleTaboo = (cardId: string) =>
    setTabooOpen((open) => {
      const next = new Set(open);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });

  const save = async () => {
    if (database.status !== 'ready' || !editor.canSave || saving) return;
    setSaving(true);

    try {
      await upsertDeck(database.db, draft, 'custom');
      editor.markSaved(draft);
      haptics.correct();
      router.replace(`/decks/${draft.id}`);
    } finally {
      setSaving(false);
    }
  };

  const leave = () => {
    if (!editor.dirty) {
      router.back();
      return;
    }

    Alert.alert('Leave without saving?', 'Your changes to this deck will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const commitNewCard = () => {
    const text = newCard.trim();
    if (!text) return;
    editor.addCard(text);
    haptics.select();
    setNewCard('');
  };

  const applyPaste = () => {
    const result = editor.bulkPaste(pasteText);
    editor.appendCards(result.cards);
    setPasteText('');
    setPasting(false);
    haptics.correct();

    const notes: string[] = [];
    if (result.cards.length) notes.push(`Added ${result.cards.length}.`);
    if (result.duplicates.length) notes.push(`Skipped ${result.duplicates.length} already here.`);
    if (result.overLength.length) {
      notes.push(`${result.overLength.length} over ${CARD_TEXT_SOFT_CAP} characters — they’ll be small on the card.`);
    }

    if (notes.length) Alert.alert('Pasted', notes.join(' '));
  };

  if (pasting) {
    return (
      <Screen>
        <TopBar leading="close" onLeading={() => setPasting(false)} title="Paste a list" />
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.pasteBody}>
            <Text variant="body" tone="muted">
              One card per line. Add a hint for clue-givers after a pipe:{' '}
              <Text variant="label" tone="default">
                Card text | hint
              </Text>
            </Text>
            <Field
              value={pasteText}
              onChangeText={setPasteText}
              placeholder={'My Chemical Romance\nFall Out Boy | They sang Sugar\nParamore'}
              accessibilityLabel="Cards, one per line"
              multiline
              autoFocus
              autoCapitalize="sentences"
              autoCorrect={false}
              style={styles.pasteBox}
            />
          </View>
          <Footer>
            <Button label="Add them" variant="primary" size="lg" icon="plus" disabled={!pasteText.trim()} onPress={applyPaste} />
          </Footer>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  const count = draft.cards.length;
  const needed = Math.max(0, MIN_PLAYABLE_CARDS - count);
  const onAccent = cardTextOn(draft.accentColor);

  return (
    <Screen>
      <TopBar leading="close" onLeading={leave} leadingLabel="Close editor" title={isNew ? 'New deck' : 'Edit deck'} />

      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={draft.cards}
          keyExtractor={(card) => card.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.meta}>
              {/* A live preview: this is what the deck will look like. */}
              <View style={[styles.preview, { backgroundColor: draft.accentColor }]}>
                <Text style={styles.previewWatermark} accessible={false} allowFontScaling={false}>
                  {draft.emoji ?? DEFAULT_DECK_EMOJI}
                </Text>
                <View style={styles.previewSticker}>
                  <EmojiSticker emoji={draft.emoji ?? DEFAULT_DECK_EMOJI} size={58} />
                </View>
                <Text variant="display" style={{ color: onAccent }} numberOfLines={2}>
                  {draft.name.trim() || 'Your deck'}
                </Text>
                <Text variant="label" style={{ color: onAccent, opacity: 0.9 }}>
                  {count} {count === 1 ? 'card' : 'cards'}
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Field
                  value={draft.name}
                  onChangeText={editor.setName}
                  placeholder="Deck name"
                  accessibilityLabel="Deck name"
                  size="heading"
                  maxLength={60}
                />
                <Field
                  value={draft.description}
                  onChangeText={editor.setDescription}
                  placeholder="What’s in it? (optional)"
                  accessibilityLabel="Deck description"
                  maxLength={280}
                />
              </View>

              <View style={styles.swatches} accessibilityRole="radiogroup">
                {deckColors.map((accent) => {
                  const selected = draft.accentColor.toLowerCase() === accent.toLowerCase();
                  return (
                    <View key={accent} style={styles.swatchCell}>
                      <Pressable
                        onPress={() => {
                          haptics.select();
                          editor.setAccentColor(accent);
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Deck colour ${accent}`}
                        style={[styles.swatchRing, selected && { borderColor: accent }]}
                      >
                        <View style={[styles.swatch, { backgroundColor: accent }]}>
                          {selected ? <Icon name="check" size={20} color={cardTextOn(accent)} weight={3.5} /> : null}
                        </View>
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              <View style={styles.emojiBlock}>
                <Text variant="overline" tone="faint">
                  COVER EMOJI
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.emojis}
                  keyboardShouldPersistTaps="handled"
                  accessibilityRole="radiogroup"
                >
                  {DECK_EMOJI_CHOICES.map((choice) => {
                    const selected = (draft.emoji ?? null) === choice;
                    return (
                      <Pressable
                        key={choice}
                        onPress={() => {
                          haptics.select();
                          editor.setEmoji(selected ? null : choice);
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Cover emoji ${choice}`}
                        style={[styles.emojiChoice, selected && { borderColor: draft.accentColor, backgroundColor: color.surfaceRaised }]}
                      >
                        <Text style={styles.emojiGlyph} allowFontScaling={false}>
                          {choice}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.progress}>
                <View style={styles.progressText}>
                  <Text variant="heading">
                    {count} {count === 1 ? 'card' : 'cards'}
                  </Text>
                  <Text variant="label" tone={needed > 0 ? 'pass' : 'correct'}>
                    {needed > 0 ? `${needed} more to play` : 'Ready to play!'}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <ProgressBar value={count / MIN_PLAYABLE_CARDS} height={12} />
                </View>
              </View>

              <View style={styles.addRow}>
                <Field
                  value={newCard}
                  onChangeText={setNewCard}
                  onSubmitEditing={commitNewCard}
                  placeholder="Type a card and hit return"
                  accessibilityLabel="New card text"
                  style={styles.grow}
                  returnKeyType="done"
                  submitBehavior="submit"
                />
                <Tap
                  onPress={commitNewCard}
                  disabled={!newCard.trim()}
                  accessibilityLabel="Add card"
                  contentStyle={[styles.addButton, { backgroundColor: newCard.trim() ? color.brand : color.surface }]}
                >
                  <Icon name="plus" size={26} color={newCard.trim() ? color.ink : color.textFaint} weight={3.5} />
                </Tap>
              </View>

              <View style={styles.bulkRow}>
                <Button label="Paste a list" icon="paste" size="sm" onPress={() => setPasting(true)} style={styles.grow} />
                <Button
                  label={busyPhoto ? 'Adding…' : 'Photo cards'}
                  icon="camera"
                  size="sm"
                  disabled={busyPhoto}
                  onPress={() => void addPhotoCards()}
                  style={styles.grow}
                />
              </View>

              {count > 0 ? (
                <Text variant="overline" tone="faint">
                  CARDS
                </Text>
              ) : null}
            </View>
          }
          renderItem={({ item, index }) => {
            const tooLong = item.text.length > CARD_TEXT_SOFT_CAP;
            const showTaboo = tabooOpen.has(item.id) || (item.taboo?.length ?? 0) > 0;

            return (
              <View style={styles.cardRow}>
                {item.image ? (
                  <Pressable
                    onPress={() => photoFor(item.id, true)}
                    accessibilityRole="button"
                    accessibilityLabel={`Photo on card ${index + 1}. Change or remove it.`}
                  >
                    <Image source={{ uri: item.image }} style={styles.thumb} />
                  </Pressable>
                ) : null}
                <View style={styles.cardBody}>
                  <Field
                    value={item.text}
                    onChangeText={(text) => editor.updateCard(item.id, { text })}
                    accessibilityLabel={`Card ${index + 1}`}
                    multiline
                    style={styles.cardInput}
                  />
                  {tooLong ? (
                    <Text variant="caption" tone="pass">
                      {item.text.length} characters — small at arm’s length
                    </Text>
                  ) : null}
                  {showTaboo ? (
                    <TabooField
                      initial={item.taboo ?? []}
                      onChange={(taboo) => editor.updateCard(item.id, { taboo })}
                      label={`Banned words for card ${index + 1}`}
                    />
                  ) : null}
                  <View style={styles.extras}>
                    {item.image ? null : (
                      <Extra label="+ Photo" hint={`Add a photo to card ${index + 1}`} onPress={() => photoFor(item.id, false)} />
                    )}
                    {showTaboo ? null : (
                      <Extra label="+ Banned words" hint={`Add banned words to card ${index + 1}`} onPress={() => toggleTaboo(item.id)} />
                    )}
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <SmallIcon
                    icon="up"
                    hint={`Move card ${index + 1} up`}
                    disabled={index === 0}
                    onPress={() => editor.moveUp(item.id)}
                  />
                  <SmallIcon
                    icon="down"
                    hint={`Move card ${index + 1} down`}
                    disabled={index === count - 1}
                    onPress={() => editor.moveDown(item.id)}
                  />
                  <SmallIcon icon="trash" hint={`Delete card ${index + 1}`} danger onPress={() => editor.removeCard(item.id)} />
                </View>
              </View>
            );
          }}
        />

        <Footer>
          {editor.errors.length > 0 && count > 0 ? (
            <Text variant="caption" tone="pass" align="center">
              {editor.errors[0]?.message}
            </Text>
          ) : null}
          <Button
            label={saving ? 'Saving…' : 'Save deck'}
            variant="primary"
            size="lg"
            icon="check"
            disabled={!editor.canSave || saving}
            onPress={() => void save()}
          />
        </Footer>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** Banned words (the `taboo` field) as a comma-separated line, parsed as it is typed. */
function TabooField({ initial, onChange, label }: { initial: readonly string[]; onChange: (taboo: string[]) => void; label: string }) {
  const [text, setText] = useState(initial.join(', '));
  return (
    <Field
      value={text}
      onChangeText={(next) => {
        setText(next);
        onChange(parseTabooInput(next));
      }}
      placeholder="🚫 Words the room can’t say, separated by commas"
      accessibilityLabel={label}
      autoCapitalize="none"
      autoCorrect={false}
      style={styles.tabooInput}
    />
  );
}

function Extra({ label, hint, onPress }: { label: string; hint: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint}
      hitSlop={6}
      style={({ pressed }) => [styles.extra, pressed && styles.iconPressed]}
    >
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </Pressable>
  );
}

function SmallIcon({
  icon,
  hint,
  onPress,
  disabled = false,
  danger = false,
}: {
  icon: IconName;
  hint: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={hint}
      accessibilityState={{ disabled }}
      hitSlop={4}
      style={({ pressed }) => [styles.icon, disabled && styles.iconDisabled, pressed && !disabled && styles.iconPressed]}
    >
      <Icon name={icon} size={18} color={danger ? color.danger : color.textMuted} weight={3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { paddingBottom: space.lg, flexGrow: 1 },
  meta: { gap: space.md, paddingHorizontal: gutter, paddingBottom: space.sm },
  preview: { minHeight: 140, justifyContent: 'flex-end', padding: space.lg, gap: 2, borderRadius: radius.xl, overflow: 'hidden' },
  previewWatermark: {
    position: 'absolute',
    right: -30,
    top: -20,
    fontSize: 150,
    lineHeight: 180,
    opacity: 0.2,
    transform: [{ rotate: '-14deg' }],
  },
  previewSticker: { position: 'absolute', top: space.md, left: space.md },
  emojiBlock: { gap: space.sm },
  emojis: { gap: space.sm, paddingRight: space.md },
  emojiChoice: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: color.surface,
  },
  emojiGlyph: { fontSize: 24, lineHeight: 30 },
  fieldGroup: { gap: space.sm },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.sm },
  swatchCell: { width: '25%', alignItems: 'center' },
  swatchRing: {
    padding: 3,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: { gap: space.sm },
  progressText: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  progressBar: { flexDirection: 'row' },
  addRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  grow: { flex: 1 },
  addButton: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  pasteBody: { flex: 1, paddingHorizontal: gutter, gap: space.md },
  pasteBox: { flex: 1, minHeight: 200 },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingHorizontal: gutter,
    paddingVertical: space.xs,
  },
  cardBody: { flex: 1, gap: 2 },
  cardInput: { paddingVertical: space.sm + 2 },
  thumb: { width: 52, height: 52, borderRadius: radius.sm, marginTop: 2 },
  extras: { flexDirection: 'row', gap: space.md, paddingTop: 2 },
  extra: { paddingVertical: 2, borderRadius: radius.sm },
  tabooInput: { paddingVertical: space.xs + 2, fontSize: 15 },
  bulkRow: { flexDirection: 'row', gap: space.sm },
  cardActions: { flexDirection: 'row', gap: 2, paddingTop: 6 },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  iconDisabled: { opacity: 0.3 },
  iconPressed: { backgroundColor: color.surface },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
