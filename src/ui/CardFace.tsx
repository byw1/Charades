import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { isEmojiCard } from '@/decks/types';
import { cardTextOn } from './contrast';
import { CARD_LETTER_SPACING, fitCardText } from './fitText';
import { font, radius } from './tokens';

export type CardFaceProps = {
  text: string;
  accentColor: string;
  /** Only shown for an emoji card, where it is the answer the room needs. */
  note?: string | null;
  /** Shown in Taboo mode: the words the room may not say. */
  taboo?: readonly string[];
  /** A card photo, as a data URI. */
  image?: string;
};

/**
 * Room kept clear round the word. Sideways, the notch and rounded corners are
 * at the ends; upright, the Dynamic Island and the timer are at the top, and
 * width is the scarce thing, so the sides give it back.
 */
const PAD = {
  sideways: { x: 48, y: 56 },
  upright: { x: 22, y: 96 },
} as const;
const GAP = 24;

/**
 * The card. Not a card-shaped thing on a screen — the whole screen.
 *
 * Full-bleed deck colour, a couple of soft circles for depth, and the word in
 * the display face at the largest size that fits. It is read at arm's
 * length across a dim room, so size beats everything.
 *
 * The size is worked out up front by `fitCardText`, which also balances a
 * title across lines. The platform's shrink-to-fit stays on underneath as a
 * backstop for the rare card the estimate gets slightly wrong.
 *
 * Three kinds of card share the face. A photo card puts the photo beside the
 * words. An emoji card draws the emoji huge and the answer underneath, since
 * the room has to know what it is acting out. In Taboo mode the forbidden
 * words sit under the card in a dark strip that reads on any deck colour.
 */
export function CardFace({ text, accentColor, note, taboo, image }: CardFaceProps) {
  const { width, height } = useWindowDimensions();
  const color = cardTextOn(accentColor);
  // An upright photo card stacks the photo over the word.
  const upright = height > width;
  const pad = upright ? PAD.upright : PAD.sideways;

  const innerW = width - pad.x * 2;
  const innerH = height - pad.y * 2;

  const answer = note && isEmojiCard({ text }) ? note : null;
  const forbidden = taboo && taboo.length > 0 ? taboo : null;

  const photo = image ? (upright ? Math.min(innerW * 0.8, innerH * 0.42) : Math.min(innerH, innerW * 0.42)) : 0;
  const textW = image && !upright ? innerW - photo - GAP : innerW;
  const roomH = image && upright ? innerH - photo - GAP : innerH;
  const textH = forbidden ? roomH * 0.5 : answer ? roomH * 0.66 : roomH;
  const fit = fitCardText(text, textW, textH, image ? { maxSize: 120 } : undefined);
  const answerFit = answer ? fitCardText(answer, textW, innerH * 0.24, { maxSize: 48, minSize: 20, maxLines: 2 }) : null;

  return (
    <View style={[styles.face, { backgroundColor: accentColor, paddingHorizontal: pad.x, paddingVertical: pad.y }]}>
      <View style={[styles.blob, styles.blobOne]} pointerEvents="none" />
      <View style={[styles.blob, styles.blobTwo]} pointerEvents="none" />

      <View style={[styles.row, upright && styles.column]}>
        {image ? (
          <Image
            source={{ uri: image }}
            style={[styles.photo, { width: photo, height: photo }]}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : null}

        <View style={[styles.words, { width: textW }]}>
          <Text
            style={[
              styles.text,
              { color, fontSize: fit.fontSize, lineHeight: fit.lineHeight, letterSpacing: fit.fontSize * CARD_LETTER_SPACING },
            ]}
            numberOfLines={fit.lines.length}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
            allowFontScaling={false}
            accessibilityLabel={answer ? `${text}. ${answer}` : text}
          >
            {fit.lines.join('\n')}
          </Text>

          {answer && answerFit ? (
            <Text
              style={[styles.answer, { color, fontSize: answerFit.fontSize, lineHeight: answerFit.lineHeight }]}
              numberOfLines={2}
              adjustsFontSizeToFit
              allowFontScaling={false}
              accessible={false}
            >
              {answer}
            </Text>
          ) : null}

          {forbidden ? (
            <View style={styles.taboo} accessibilityLabel={`Don't say ${forbidden.join(', ')}`}>
              <Text style={styles.tabooLabel} allowFontScaling={false}>
                🚫 DON’T SAY
              </Text>
              <View style={styles.tabooWords}>
                {forbidden.map((word) => (
                  <Text key={word} style={styles.tabooWord} allowFontScaling={false} numberOfLines={1}>
                    {word}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  blobOne: { width: 420, height: 420, top: -180, left: -120 },
  blobTwo: { width: 320, height: 320, bottom: -160, right: -80 },
  row: { flexDirection: 'row', alignItems: 'center', gap: GAP },
  column: { flexDirection: 'column' },
  photo: { borderRadius: radius.lg, borderWidth: 4, borderColor: 'rgba(255,255,255,0.9)' },
  words: { alignItems: 'center', gap: 10 },
  text: {
    fontFamily: font.card,
    textAlign: 'center',
  },
  answer: {
    fontFamily: font.heavy,
    textAlign: 'center',
    opacity: 0.92,
  },
  taboo: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(10,10,13,0.82)',
  },
  tabooLabel: { fontFamily: font.heavy, fontSize: 13, lineHeight: 16, letterSpacing: 1.5, color: '#FF6B75' },
  tabooWords: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 18, rowGap: 4 },
  tabooWord: { fontFamily: font.heavy, fontSize: 24, lineHeight: 30, color: '#FFFFFF' },
});
