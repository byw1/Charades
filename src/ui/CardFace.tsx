import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { cardTextOn } from './contrast';
import { CARD_LETTER_SPACING, fitCardText } from './fitText';
import { font } from './tokens';

export type CardFaceProps = {
  text: string;
  accentColor: string;
};

/** Horizontal room kept clear for the notch and rounded corners. */
const PAD_X = 48;
/** Vertical room kept clear for the timer bar above and breathing room below. */
const PAD_Y = 56;

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
 */
export function CardFace({ text, accentColor }: CardFaceProps) {
  const { width, height } = useWindowDimensions();
  const color = cardTextOn(accentColor);
  const fit = fitCardText(text, width - PAD_X * 2, height - PAD_Y * 2);

  return (
    <View style={[styles.face, { backgroundColor: accentColor }]}>
      <View style={[styles.blob, styles.blobOne]} pointerEvents="none" />
      <View style={[styles.blob, styles.blobTwo]} pointerEvents="none" />
      <Text
        style={[
          styles.text,
          { color, fontSize: fit.fontSize, lineHeight: fit.lineHeight, letterSpacing: fit.fontSize * CARD_LETTER_SPACING },
        ]}
        numberOfLines={fit.lines.length}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        allowFontScaling={false}
        accessibilityLabel={text}
      >
        {fit.lines.join('\n')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PAD_X,
    paddingVertical: PAD_Y,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  blobOne: { width: 420, height: 420, top: -180, left: -120 },
  blobTwo: { width: 320, height: 320, bottom: -160, right: -80 },
  text: {
    fontFamily: font.card,
    textAlign: 'center',
  },
});
