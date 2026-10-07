import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { buildGroupDeck, DEFAULT_GROUP_DECK_NAME, GROUP_PROMPTS, groupCards, type GroupPhoto } from '@/decks/group';
import { MIN_PLAYABLE_CARDS } from '@/decks/types';
import { useDatabase } from '@/hooks/useDatabase';
import { useHaptics } from '@/hooks/useHaptics';
import { pickPhotos } from '@/media/photos';
import { upsertDeck } from '@/storage/deckRepo';
import { Button } from '@/ui/Button';
import { cardTextOn } from '@/ui/contrast';
import { Field } from '@/ui/Field';
import { Icon } from '@/ui/Icon';
import { Footer, Screen } from '@/ui/Screen';
import { StepHeader } from '@/ui/StepHeader';
import { Text } from '@/ui/Text';
import { color, deckColors, gutter, radius, space } from '@/ui/tokens';

/** The questions, then photos, then a name. */
const STEPS = GROUP_PROMPTS.length + 2;

/**
 * A deck about your group, one question at a time.
 *
 * Laid out like a story: a bar of segments along the top, one big question per
 * screen, and every line typed becomes a card. Nothing is required — skip a
 * question and the next one comes up — and the photos step turns faces into
 * cards.
 */
export default function GroupDeckScreen() {
  const router = useRouter();
  const database = useDatabase();
  const haptics = useHaptics();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<GroupPhoto[]>([]);
  const [name, setName] = useState('');
  const [accent, setAccent] = useState<string>(deckColors[0]);
  const [busy, setBusy] = useState(false);

  const prompt = GROUP_PROMPTS[step];
  const count = groupCards({ answers, photos }).length;
  const short = Math.max(0, MIN_PLAYABLE_CARDS - count);

  const next = () => {
    haptics.select();
    setStep((s) => Math.min(STEPS - 1, s + 1));
  };
  const back = () => (step === 0 ? router.back() : setStep((s) => s - 1));

  const addPhotos = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const picked = await pickPhotos({ multiple: true });
      setPhotos((current) => [...current, ...picked.map((image) => ({ image, name: '' }))]);
    } finally {
      setBusy(false);
    }
  };

  const make = async () => {
    if (database.status !== 'ready' || busy) return;
    setBusy(true);
    try {
      const deck = buildGroupDeck({
        answers,
        // An unnamed photo has no answer to guess, so it stays out.
        photos: photos.filter((p) => p.name.trim()),
        name,
        accentColor: accent,
        now: new Date().toISOString(),
      });
      await upsertDeck(database.db, deck, 'custom');
      haptics.correct();
      router.replace(`/decks/${deck.id}`);
    } finally {
      setBusy(false);
    }
  };

  const tally = (
    <Text variant="label" tone={short > 0 ? 'muted' : 'correct'} align="center">
      {count} {count === 1 ? 'card' : 'cards'} so far{short > 0 ? ` · ${short} more to play` : ' · ready to play'}
    </Text>
  );

  if (prompt) {
    const value = answers[prompt.id] ?? '';
    return (
      <Screen>
        <StepHeader step={step + 1} of={STEPS} title={`${prompt.emoji} ${prompt.title}`} subtitle={prompt.hint} onClose={router.back} mood="wink" />
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.body}>
            <Field
              key={prompt.id}
              value={value}
              onChangeText={(text) => setAnswers((a) => ({ ...a, [prompt.id]: text }))}
              placeholder={prompt.example}
              accessibilityLabel={prompt.title}
              multiline
              autoFocus
              autoCapitalize="sentences"
              style={styles.box}
            />
            {tally}
          </View>
          <Footer>
            <Button label={value.trim() ? 'Next' : 'Skip'} variant="primary" size="lg" icon="forward" onPress={next} />
            {step > 0 ? <Button label="Back" variant="ghost" onPress={back} /> : null}
          </Footer>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  if (step === GROUP_PROMPTS.length) {
    return (
      <Screen>
        <StepHeader
          step={step + 1}
          of={STEPS}
          title="📸 Faces"
          subtitle="Pick photos of the group and name each one. The room sees the face; the guesser has to say the name."
          onClose={router.back}
          mood="excited"
        />
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.photos} keyboardShouldPersistTaps="handled">
            {photos.map((photo, index) => (
              <View key={`${index}-${photo.image.length}`} style={styles.photoRow}>
                <Image source={{ uri: photo.image }} style={styles.photo} />
                <Field
                  value={photo.name}
                  onChangeText={(text) => setPhotos((all) => all.map((p, i) => (i === index ? { ...p, name: text } : p)))}
                  placeholder="Who’s this?"
                  accessibilityLabel={`Name for photo ${index + 1}`}
                  autoCapitalize="words"
                  style={styles.grow}
                />
                <Pressable
                  onPress={() => setPhotos((all) => all.filter((_, i) => i !== index))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${index + 1}`}
                  hitSlop={8}
                >
                  <Icon name="trash" size={20} color={color.danger} weight={3} />
                </Pressable>
              </View>
            ))}
            <Button label={busy ? 'Adding…' : photos.length ? 'Add more photos' : 'Choose photos'} icon="camera" disabled={busy} onPress={() => void addPhotos()} />
            {tally}
          </ScrollView>
          <Footer>
            <Button label={photos.length ? 'Next' : 'Skip'} variant="primary" size="lg" icon="forward" onPress={next} />
            <Button label="Back" variant="ghost" onPress={back} />
          </Footer>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  const ink = cardTextOn(accent);
  return (
    <Screen>
      <StepHeader step={STEPS} of={STEPS} title="🎉 Name it" subtitle="Pick a name and a colour." onClose={router.back} mood="excited" />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={[styles.preview, { backgroundColor: accent }]}>
            <Text variant="display" style={{ color: ink }} numberOfLines={2}>
              {name.trim() || DEFAULT_GROUP_DECK_NAME}
            </Text>
            <Text variant="label" style={{ color: ink, opacity: 0.85 }}>
              {count} {count === 1 ? 'card' : 'cards'}
            </Text>
          </View>
          <Field value={name} onChangeText={setName} placeholder={DEFAULT_GROUP_DECK_NAME} accessibilityLabel="Deck name" size="heading" maxLength={60} />
          <View style={styles.swatches} accessibilityRole="radiogroup">
            {deckColors.map((c) => (
              <Pressable
                key={c}
                onPress={() => setAccent(c)}
                accessibilityRole="radio"
                accessibilityState={{ selected: c === accent }}
                accessibilityLabel={`Deck colour ${c}`}
                style={[styles.swatch, { backgroundColor: c }, c === accent && styles.swatchOn]}
              />
            ))}
          </View>
          {short > 0 ? (
            <Text variant="caption" tone="muted" align="center">
              {short} more {short === 1 ? 'card' : 'cards'} and it’s playable. Make it now and add the rest in the editor.
            </Text>
          ) : null}
        </ScrollView>
        <Footer>
          <Button label={busy ? 'Making it…' : 'Make the deck'} variant="primary" size="lg" icon="check" disabled={busy || count === 0} onPress={() => void make()} />
          <Button label="Back" variant="ghost" onPress={back} />
        </Footer>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { flexGrow: 1, paddingHorizontal: gutter, gap: space.md, paddingBottom: space.md },
  box: { flex: 1, minHeight: 180, fontSize: 18, lineHeight: 26 },
  photos: { paddingHorizontal: gutter, gap: space.md, paddingBottom: space.lg },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  photo: { width: 56, height: 56, borderRadius: radius.sm },
  grow: { flex: 1 },
  preview: { minHeight: 150, justifyContent: 'flex-end', padding: space.lg, borderRadius: radius.xl, gap: 2 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'center' },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: 'transparent' },
  swatchOn: { borderColor: color.bone },
});
