import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { deckFileName, deckLink, measure, QR_ERROR_CORRECTION, type ShareSize } from '@/decks/share';
import type { StoredDeck } from '@/decks/types';
import { useDatabase } from '@/hooks/useDatabase';
import { useHaptics } from '@/hooks/useHaptics';
import { getDeck } from '@/storage/deckRepo';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { Mascot } from '@/ui/Mascot';
import { PopIn } from '@/ui/motion';
import { Raised } from '@/ui/Raised';
import { Screen } from '@/ui/Screen';
import { SpeechBubble } from '@/ui/SpeechBubble';
import { Text } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';
import { color, radius, space } from '@/ui/tokens';

/**
 * Share a deck.
 *
 * Target: someone builds a deck of inside jokes and seven people have it in
 * under thirty seconds. A QR on screen is the fastest path for people in the
 * same room, which is where this game is played, so it leads.
 */
export default function ShareDeckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const database = useDatabase();
  const haptics = useHaptics();
  const { width } = useWindowDimensions();

  const [deck, setDeck] = useState<StoredDeck | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (database.status !== 'ready' || !id) return;

    let cancelled = false;
    void (async () => {
      const loaded = await getDeck(database.db, id);
      if (cancelled) return;
      if (loaded) setDeck(loaded);
      else setMissing(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [database, id]);

  const size: ShareSize | null = useMemo(() => (deck ? measure(deck) : null), [deck]);

  const top = <TopBar leading="close" onLeading={router.back} title="Share deck" />;

  if (missing) {
    return (
      <Screen>
        {top}
        <EmptyState title="That deck is gone" body="It may have been deleted." mood="sad" />
      </Screen>
    );
  }

  if (!deck || !size) {
    return (
      <Screen>
        {top}
        <View style={styles.centre}>
          <ActivityIndicator color={color.brand} size="large" />
        </View>
      </Screen>
    );
  }

  const shareFile = async () => {
    if (busy) return;
    setBusy(true);

    try {
      // Written to cache rather than documents: it is a transient artefact of
      // sharing, not something the user owns a copy of.
      const file = new File(Paths.cache, deckFileName(deck));
      if (file.exists) file.delete();
      file.create();
      file.write(size.payload);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/octet-stream',
          dialogTitle: `Share ${deck.name}`,
          UTI: 'public.data',
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    await Clipboard.setStringAsync(deckLink(deck));
    haptics.correct();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Full width less padding, capped so it does not dominate a large screen.
  const qrSize = Math.min(width - 40 - space.lg * 2, 300);

  return (
    <Screen>
      {top}

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.hello}>
          <Mascot size={72} mood={size.fitsQr ? 'wink' : 'thinking'} />
          <SpeechBubble>
            <Text variant="heading">
              {size.fitsQr ? 'Point a friend’s camera at this!' : 'Too big for a code — send it as a file.'}
            </Text>
            <Text variant="caption" tone="muted">
              {deck.name} · {deck.cards.length} {deck.cards.length === 1 ? 'card' : 'cards'}
            </Text>
          </SpeechBubble>
        </View>

        {size.fitsQr ? (
          <PopIn>
            <Raised
              face={color.background}
              shade={color.brandShade}
              border={color.brand}
              radius={radius.xl}
              ledge={6}
              style={styles.qrOuter}
              faceStyle={styles.qrFace}
            >
              <QRCode
                value={size.payload}
                size={qrSize}
                ecl={QR_ERROR_CORRECTION}
                backgroundColor={color.background}
                color={color.ink}
              />
            </Raised>
          </PopIn>
        ) : (
          <Text variant="body" tone="muted" style={styles.pad}>
            This deck has {deck.cards.length} cards, which is more than a scannable code holds. A file works
            exactly the same at the other end.
          </Text>
        )}

        <View style={styles.actions}>
          <Button
            label={busy ? 'Preparing' : 'Send as a file'}
            variant={size.fitsQr ? 'blue' : 'primary'}
            icon="share"
            disabled={busy}
            onPress={() => void shareFile()}
            accessibilityHint="Opens the share sheet with a .deckhead file"
          />
          <Button
            label={copied ? 'Link copied!' : 'Copy link'}
            icon={copied ? 'check' : 'link'}
            onPress={() => void copyLink()}
            accessibilityHint="Copies a link that opens this deck in Deckhead"
          />
        </View>

        <Text variant="caption" tone="faint" align="center" style={styles.pad}>
          The whole deck travels inside the code, link or file. Nothing is uploaded anywhere.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: space.xl, gap: space.lg },
  hello: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: 20 },
  qrOuter: { alignSelf: 'center' },
  qrFace: { padding: space.lg, alignItems: 'center', justifyContent: 'center' },
  actions: { gap: space.sm + 4, paddingHorizontal: 20 },
  pad: { paddingHorizontal: 20 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
