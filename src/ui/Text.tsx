import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';
import { color, type } from './tokens';

type Variant = keyof typeof type;
export type Tone =
  | 'default'
  | 'muted'
  | 'faint'
  | 'inverse'
  | 'brand'
  | 'focus'
  | 'correct'
  | 'pass';

export type TextProps = RNTextProps & {
  variant?: Variant;
  tone?: Tone;
  align?: 'left' | 'center' | 'right';
};

const tones: Record<Tone, string> = {
  default: color.text,
  muted: color.textMuted,
  faint: color.textFaint,
  inverse: color.ink,
  brand: color.brandText,
  focus: color.focus,
  correct: color.correct,
  pass: color.pass,
};

/**
 * UI text. Card text in a round is its own component, since it auto-fits the
 * screen rather than following the type scale.
 *
 * Dynamic Type stays on, capped so the largest accessibility sizes still fit a
 * pill button rather than breaking out of it. `inverse` is dark text, for the
 * few light surfaces in a dark app: the yellow button, a white sticker.
 */
export function Text({ variant = 'body', tone = 'default', align, style, ...rest }: TextProps) {
  return (
    <RNText
      style={StyleSheet.compose(
        [type[variant], { color: tones[tone] }, align ? { textAlign: align } : null],
        style,
      )}
      maxFontSizeMultiplier={1.6}
      {...rest}
    />
  );
}
