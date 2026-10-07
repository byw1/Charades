import { CameraView, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { collectQrPart, extractPayload, isQrPart, type QrCollection } from '@/decks/share';
import { DEFAULT_DECK_EMOJI } from '@/decks/types';
import { useDatabase } from '@/hooks/useDatabase';
import { useDeckImport } from '@/hooks/useDeckImport';
import { useHaptics } from '@/hooks/useHaptics';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { cardTextOn } from '@/ui/contrast';
import { EmojiSticker } from '@/ui/EmojiSticker';
import { Field } from '@/ui/Field';
import { Mascot } from '@/ui/Mascot';
import { PopIn } from '@/ui/motion';
import { Footer, Screen } from '@/ui/Screen';
import { ChatLine } from '@/ui/Social';
import { Text } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';
import { color, gutter, palette, radius, space } from '@/ui/tokens';

type Method = 'scan' | 'paste' | 'file';

/**
 * Reads a file handed over by iOS. AirDropped and mailed files are copied
 * into the app's Inbox folder first; the copy is removed once read, since the
 * deck is about to be imported properly or declined.
 */
function readIncomingFile(uri: string): string {
  try {
    const incoming = new File(uri);
    const contents = incoming.textSync();
    if (/\/Inbox\//.test(uri)) {
      try {
        incoming.delete();
      } catch {
        // Leaving a copy behind is harmless.
      }
    }
    return contents;
  } catch {
    return '';
  }
}

/**
 * Import a deck.
 *
 * Scan, file or paste, then always a preview and a confirm tap. Nothing is
 * ever written without being shown first.
 */
export default function ImportDeckScreen() {
  const router = useRouter();
  const database = useDatabase();
  const haptics = useHaptics();
  const importer = useDeckImport();

  /**
   * Set when arriving from outside: a deck link carries a payload, and a
   * .deckhead file opened from AirDrop, Files or Mail carries its location.
   * Either skips straight to the preview.
   */
  const { payload, file } = useLocalSearchParams<{ payload?: string; file?: string }>();

  const [method, setMethod] = useState<Method>('scan');
  const [pasted, setPasted] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const scanning = useRef(false);
  // Pieces of a big deck shown as a sequence of codes, collected as they pass.
  const pieces = useRef<QrCollection | null>(null);
  const [progress, setProgress] = useState<{ have: number; total: number } | null>(null);

  const db = database.status === 'ready' ? database.db : null;

  const offer = useCallback(
    (text: string) => {
      if (!db) return;
      const found = extractPayload(text) ?? text;
      void importer.offer(found, db);
    },
    [db, importer],
  );

  useEffect(() => {
    if (payload && db && importer.state.status === 'idle') offer(payload);
  }, [payload, db, importer.state.status, offer]);

  const openedFile = useRef(false);
  useEffect(() => {
    if (!file || !db || openedFile.current) return;
    openedFile.current = true;
    offer(readIncomingFile(file));
  }, [file, db, offer]);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;

    try {
      const contents = new File(result.assets[0].uri).textSync();
      offer(contents);
    } catch {
      offer('');
    }
  };

  const preview = importer.state.status === 'preview' ? importer.state : null;
  const done = importer.state.status === 'done' ? importer.state : null;
  const error = importer.state.status === 'error' ? importer.state : null;

  if (done) {
    return (
      <Screen>
        <TopBar leading="close" onLeading={router.back} />
        <View style={styles.celebrate}>
          <PopIn>
            <Mascot size={160} mood="excited" glyph="✓" />
          </PopIn>
          <PopIn delay={100} style={styles.celebrateCopy}>
            <Text variant="display" align="center">
              {done.action === 'replaced' ? 'Deck updated!' : 'Deck added!'}
            </Text>
            <Text variant="body" tone="muted" align="center">
              {done.deck.name} · {done.deck.cards.length} cards
              {done.action === 'copied' ? ' · saved as a copy' : ''}
            </Text>
          </PopIn>
        </View>
        <Footer>
          <Button label="Open it" variant="primary" size="lg" onPress={() => router.replace(`/decks/${done.deck.id}`)} />
          <Button
            label="Import another"
            onPress={() => {
              importer.reset();
              scanning.current = false;
              setPasted('');
            }}
          />
        </Footer>
      </Screen>
    );
  }

  if (preview) {
    const deck = preview.deck;
    const onAccent = cardTextOn(deck.accentColor);

    return (
      <Screen>
        <TopBar leading="close" onLeading={router.back} title="Add this deck?" />

        <ScrollView contentContainerStyle={styles.body}>
          <PopIn>
            <View style={[styles.pad, styles.previewCard, { backgroundColor: deck.accentColor }]}>
              <View style={styles.previewSticker}>
                <EmojiSticker emoji={deck.emoji ?? DEFAULT_DECK_EMOJI} size={58} />
              </View>
              <Text variant="display" style={{ color: onAccent }} numberOfLines={2}>
                {deck.name}
              </Text>
              <Text variant="label" style={{ color: onAccent, opacity: 0.9 }}>
                {deck.cards.length} {deck.cards.length === 1 ? 'card' : 'cards'}
                {deck.author ? ` · by ${deck.author}` : ''}
              </Text>
            </View>
          </PopIn>

          {deck.description ? (
            <Text variant="body" tone="muted" style={styles.pad}>
              {deck.description}
            </Text>
          ) : null}

          {/* A few cards, so it is obvious what you are agreeing to. */}
          <View style={[styles.pad, styles.sample]}>
            {deck.cards.slice(0, 6).map((card) => (
              <View key={card.id} style={styles.sampleChip}>
                <Text variant="label" numberOfLines={1}>
                  {card.text}
                </Text>
              </View>
            ))}
            {deck.cards.length > 6 ? (
              <View style={styles.sampleChip}>
                <Text variant="label" tone="muted">
                  +{deck.cards.length - 6} more
                </Text>
              </View>
            ) : null}
          </View>

          {preview.warnings.map((warning) => (
            <Text key={warning} variant="caption" tone="muted" style={styles.pad}>
              {warning}
            </Text>
          ))}

          {preview.collides ? (
            <View style={[styles.pad, styles.collision]}>
              <Text variant="label" style={{ color: palette.yellow }}>
                YOU ALREADY HAVE THIS DECK
              </Text>
              <Text variant="caption" tone="muted">
                Replacing overwrites your copy, including any changes you made. Keeping both is always safe.
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <Footer>
          {preview.collides ? (
            <>
              <Button
                label="Keep both"
                variant="primary"
                size="lg"
                onPress={() => {
                  if (db) void importer.confirmKeepBoth(db);
                }}
              />
              <Button
                label="Replace mine"
                variant="danger"
                onPress={() => {
                  if (db) void importer.confirmReplace(db);
                }}
              />
            </>
          ) : (
            <Button
              label="Add this deck"
              variant="primary"
              size="lg"
              icon="plus"
              onPress={() => {
                if (db) void importer.confirmAdd(db);
              }}
            />
          )}
          <Button
            label="Not now"
            variant="ghost"
            onPress={() => {
              importer.reset();
              scanning.current = false;
            }}
          />
        </Footer>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar leading="close" onLeading={router.back} title="Import a deck" />

      <View style={styles.methods}>
        <Chip grow emoji="📷" label="Scan" selected={method === 'scan'} onPress={() => setMethod('scan')} />
        <Chip grow emoji="📋" label="Paste" selected={method === 'paste'} onPress={() => setMethod('paste')} />
        <Chip grow emoji="📁" label="File" selected={method === 'file'} onPress={() => setMethod('file')} />
      </View>

      {error ? (
        <View style={styles.error}>
          <Mascot size={56} mood="sad" animated={false} />
          <Text variant="label" style={styles.errorText}>
            {error.message}
          </Text>
        </View>
      ) : null}

      {method === 'scan' ? (
        <View style={styles.area}>
          {permission?.granted ? (
            <View style={styles.camera}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }) => {
                  // Fires every frame while a code is visible, so this is
                  // latched rather than debounced — one scan, one preview.
                  if (scanning.current) return;

                  if (isQrPart(data)) {
                    const result = collectQrPart(pieces.current, data);
                    if (result.status === 'collecting') {
                      pieces.current = result.collection;
                      if (result.isNew) {
                        haptics.select();
                        setProgress({ have: result.have, total: result.total });
                      }
                      return;
                    }
                    pieces.current = null;
                    setProgress(null);
                    if (result.status === 'invalid') return;
                    scanning.current = true;
                    haptics.correct();
                    offer(result.payload);
                    return;
                  }

                  scanning.current = true;
                  haptics.correct();
                  offer(data);
                }}
              />
              <View style={styles.viewfinder} pointerEvents="none">
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />
              </View>
              <View style={styles.scanHint} pointerEvents="none">
                <Text variant="label" tone="inverse">
                  {progress ? `Got ${progress.have} of ${progress.total} codes. Keep it there…` : 'Point at a Deckhead code'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.permission}>
              <Mascot size={110} mood="wink" />
              <ChatLine>I only use the camera to read deck codes. No photos are taken or kept.</ChatLine>
              <Button
                label={permission?.canAskAgain === false ? 'Open Settings' : 'Allow camera'}
                variant="primary"
                icon="camera"
                onPress={() => {
                  if (permission?.canAskAgain === false) void Linking.openSettings();
                  else void requestPermission();
                }}
                style={styles.stretch}
              />
            </View>
          )}
        </View>
      ) : null}

      {method === 'paste' ? (
        <View style={styles.area}>
          <Field
            value={pasted}
            onChangeText={setPasted}
            placeholder="Paste a deckhead:// link or a deck code"
            accessibilityLabel="Deck link or code"
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.pasteBox}
          />
          <Button label="Import" variant="primary" size="lg" disabled={!pasted.trim()} onPress={() => offer(pasted)} />
        </View>
      ) : null}

      {method === 'file' ? (
        <View style={[styles.area, styles.fileArea]}>
          <Mascot size={110} mood="happy" glyph="📁" />
          <Text variant="body" tone="muted" align="center">
            Open a .deckhead file someone sent you — from Messages, Mail, Files or AirDrop.
          </Text>
          <Button label="Choose a file" variant="primary" icon="file" onPress={() => void pickFile()} style={styles.stretch} />
        </View>
      ) : null}
    </Screen>
  );
}

const CORNER = 34;

const styles = StyleSheet.create({
  body: { paddingTop: space.sm, paddingBottom: space.lg, gap: space.md },
  pad: { marginHorizontal: gutter },
  previewCard: { minHeight: 160, justifyContent: 'flex-end', padding: space.lg, gap: 2, borderRadius: radius.xl },
  previewSticker: { position: 'absolute', top: space.md, right: space.md },
  sample: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  sampleChip: {
    paddingHorizontal: space.sm + 4,
    paddingVertical: space.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: color.line,
    backgroundColor: color.surface,
    maxWidth: '100%',
  },
  collision: {
    gap: 4,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: palette.yellow,
    backgroundColor: 'rgba(255,229,0,0.08)',
  },
  methods: { flexDirection: 'row', gap: space.sm, paddingHorizontal: gutter, paddingTop: space.xs },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: gutter,
    marginTop: space.md,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,59,71,0.12)',
  },
  errorText: { flex: 1, color: palette.red },
  area: { flex: 1, padding: gutter, gap: space.md },
  camera: {
    flex: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: color.ink,
  },
  viewfinder: { ...StyleSheet.absoluteFill, margin: space.xl },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: color.bone },
  tl: { top: 0, left: 0, borderTopWidth: 6, borderLeftWidth: 6, borderTopLeftRadius: 16 },
  tr: { top: 0, right: 0, borderTopWidth: 6, borderRightWidth: 6, borderTopRightRadius: 16 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 6, borderLeftWidth: 6, borderBottomLeftRadius: 16 },
  br: { bottom: 0, right: 0, borderBottomWidth: 6, borderRightWidth: 6, borderBottomRightRadius: 16 },
  scanHint: {
    position: 'absolute',
    bottom: space.md,
    alignSelf: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  pasteBox: { flex: 1 },
  fileArea: { alignItems: 'center', justifyContent: 'center' },
  stretch: { alignSelf: 'stretch' },
  celebrate: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
  celebrateCopy: { gap: space.sm },
});
