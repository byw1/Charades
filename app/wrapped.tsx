import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text as RNText, useWindowDimensions, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { wrapNight, type Wrapped } from '@/game/wrapped';
import { useDatabase } from '@/hooks/useDatabase';
import { getDeck } from '@/storage/deckRepo';
import { listSessions } from '@/storage/sessionRepo';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { Mascot } from '@/ui/Mascot';
import { Footer, Screen } from '@/ui/Screen';
import { TopBar } from '@/ui/TopBar';
import { color, font, gutter, palette, space } from '@/ui/tokens';

type Loaded = { wrapped: Wrapped; cardText: Map<string, string>; deckNames: string[] };

/**
 * Tonight, wrapped.
 *
 * One story-shaped image of the night — the MVP, the best round, the fastest
 * guess and the card nobody could get — made on the phone and handed to the
 * share sheet. Nothing is uploaded: the image is drawn here, saved to a
 * temporary file, and goes wherever the person sends it.
 */
export default function WrappedScreen() {
  const router = useRouter();
  const database = useDatabase();
  const { width, height } = useWindowDimensions();
  const story = useRef<View>(null);

  const [loaded, setLoaded] = useState<Loaded | null | 'empty'>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (database.status !== 'ready') return;
    let cancelled = false;
    const { db } = database;

    void (async () => {
      const wrapped = wrapNight(await listSessions(db), new Date());
      if (!wrapped) {
        if (!cancelled) setLoaded('empty');
        return;
      }
      const decks = (await Promise.all(wrapped.deckIds.map((id) => getDeck(db, id)))).flatMap((d) => (d ? [d] : []));
      const cardText = new Map<string, string>();
      for (const deck of decks) for (const card of deck.cards) cardText.set(`${deck.id}/${card.id}`, card.text);
      if (!cancelled) setLoaded({ wrapped, cardText, deckNames: decks.map((d) => d.name) });
    })();

    return () => {
      cancelled = true;
    };
  }, [database]);

  const share = async () => {
    if (!story.current || sharing) return;
    setSharing(true);
    try {
      const uri = await captureRef(story, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing isn’t available', 'Take a screenshot instead: Side button + Volume Up.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share your night' });
    } catch {
      Alert.alert('Couldn’t make the image', 'Take a screenshot instead: Side button + Volume Up.');
    } finally {
      setSharing(false);
    }
  };

  // A 9:16 story that fits between the top bar and the button.
  const cardW = Math.min(width - gutter * 2, (height - 230) * (9 / 16));
  const k = cardW / 360;

  return (
    <Screen>
      <TopBar leading="close" onLeading={router.back} leadingLabel="Close" title="Wrapped" />

      {loaded === null ? (
        <View style={styles.center}>
          <Mascot size={100} mood="thinking" />
        </View>
      ) : loaded === 'empty' ? (
        <EmptyState title="Nothing to wrap yet" body="Play a round and your night shows up here." />
      ) : (
        <View style={styles.center}>
          <View ref={story} collapsable={false} style={[styles.story, { width: cardW, height: cardW * (16 / 9) }]}>
            <Story {...loaded} k={k} />
          </View>
        </View>
      )}

      <Footer>
        <Button
          label={sharing ? 'Making it…' : 'Share'}
          variant="primary"
          size="lg"
          icon="share"
          disabled={sharing || loaded === null || loaded === 'empty'}
          onPress={() => void share()}
        />
      </Footer>
    </Screen>
  );
}

function Story({ wrapped, cardText, deckNames, k }: Loaded & { k: number }) {
  const when = wrapped.isToday
    ? 'TONIGHT'
    : new Date(`${wrapped.day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase();

  const text = (cardId: string) => cardText.get(cardId) ?? 'a card';
  const rows: { emoji: string; label: string; value: string; tint: string }[] = [];

  if (wrapped.mvp) rows.push({ emoji: '👑', label: 'MVP', value: `${wrapped.mvp.name} · ${wrapped.mvp.cards} cards`, tint: palette.yellow });
  if (wrapped.bestRound) {
    rows.push({
      emoji: '🔥',
      label: 'Best round',
      value: `${wrapped.bestRound.name ? `${wrapped.bestRound.name} · ` : ''}${wrapped.bestRound.cards} in ${wrapped.bestRound.seconds}s`,
      tint: palette.pink,
    });
  }
  if (wrapped.fastest) {
    rows.push({
      emoji: '⚡',
      label: 'Fastest guess',
      value: `“${text(wrapped.fastest.cardId)}” in ${wrapped.fastest.seconds.toFixed(1)}s`,
      tint: palette.blue,
    });
  }
  if (wrapped.mostPassed) {
    rows.push({
      emoji: '😵',
      label: 'Nobody could get',
      value: `“${text(wrapped.mostPassed.cardId)}”${wrapped.mostPassed.times > 1 ? ` · passed ${wrapped.mostPassed.times}×` : ''}`,
      tint: palette.purple,
    });
  }
  if (wrapped.busted > 0) {
    rows.push({ emoji: '🚨', label: 'Busted', value: `${wrapped.busted} forbidden ${wrapped.busted === 1 ? 'word' : 'words'} said`, tint: palette.red });
  }

  return (
    <View style={styles.storyInner}>
      <View style={[styles.blob, { width: 300 * k, height: 300 * k, top: -110 * k, right: -90 * k, backgroundColor: palette.yellow }]} />
      <View style={[styles.blob, { width: 220 * k, height: 220 * k, bottom: -70 * k, left: -80 * k, backgroundColor: palette.pink }]} />

      <View style={{ padding: 22 * k, gap: 14 * k, flex: 1 }}>
        <View style={styles.storyHeader}>
          <View style={{ gap: 2 * k, flex: 1 }}>
            <RNText style={[styles.overline, { fontSize: 13 * k, lineHeight: 16 * k }]} allowFontScaling={false}>
              {when}, WRAPPED
            </RNText>
            <RNText style={[styles.big, { fontSize: 64 * k, lineHeight: 64 * k }]} allowFontScaling={false}>
              {wrapped.cardsGuessed}
            </RNText>
            <RNText style={[styles.bigLabel, { fontSize: 18 * k, lineHeight: 22 * k }]} allowFontScaling={false}>
              cards guessed
            </RNText>
          </View>
          <View style={{ transform: [{ rotate: '8deg' }] }}>
            <Mascot size={86 * k} mood="excited" glyph="★" animated={false} />
          </View>
        </View>

        <RNText style={[styles.sub, { fontSize: 14 * k, lineHeight: 19 * k }]} allowFontScaling={false}>
          {wrapped.games} {wrapped.games === 1 ? 'game' : 'games'} · {wrapped.rounds} {wrapped.rounds === 1 ? 'round' : 'rounds'}
          {wrapped.streak > 1 ? ` · 🔥 ${wrapped.streak}-day streak` : ''}
        </RNText>

        <View style={{ gap: 9 * k }}>
          {rows.map((row) => (
            <View key={row.label} style={[styles.row, { borderRadius: 18 * k, padding: 12 * k, gap: 12 * k }]}>
              <View style={[styles.rowIcon, { width: 40 * k, height: 40 * k, borderRadius: 20 * k, backgroundColor: row.tint }]}>
                <RNText style={{ fontSize: 20 * k, lineHeight: 26 * k }} allowFontScaling={false}>
                  {row.emoji}
                </RNText>
              </View>
              <View style={{ flex: 1 }}>
                <RNText style={[styles.rowLabel, { fontSize: 11 * k, lineHeight: 14 * k }]} allowFontScaling={false}>
                  {row.label.toUpperCase()}
                </RNText>
                <RNText style={[styles.rowValue, { fontSize: 17 * k, lineHeight: 21 * k }]} allowFontScaling={false} numberOfLines={2}>
                  {row.value}
                </RNText>
              </View>
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        {deckNames.length > 0 ? (
          <RNText style={[styles.sub, { fontSize: 12 * k, lineHeight: 16 * k }]} allowFontScaling={false} numberOfLines={2}>
            Decks: {deckNames.join(' · ')}
          </RNText>
        ) : null}
        <RNText style={[styles.footer, { fontSize: 13 * k, lineHeight: 16 * k }]} allowFontScaling={false}>
          DECKHEAD · phone on your forehead
        </RNText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: gutter },
  story: { borderRadius: 26, overflow: 'hidden', backgroundColor: '#14141A' },
  storyInner: { flex: 1, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999, opacity: 0.9 },
  storyHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  overline: { fontFamily: font.heavy, color: color.bone, letterSpacing: 1.5 },
  big: { fontFamily: font.display, color: color.bone, letterSpacing: -2 },
  bigLabel: { fontFamily: font.heavy, color: color.bone },
  sub: { fontFamily: font.bold, color: 'rgba(255,255,255,0.8)' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(10,10,13,0.78)' },
  rowIcon: { alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: font.heavy, color: 'rgba(255,255,255,0.65)', letterSpacing: 1 },
  rowValue: { fontFamily: font.heavy, color: color.bone },
  footer: { fontFamily: font.display, color: palette.yellow, letterSpacing: 0.5 },
});
