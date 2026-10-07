import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useHaptics } from '@/hooks/useHaptics';
import { Icon, type IconName } from './Icon';
import { Raised } from './Raised';
import { Text } from './Text';
import { color, minTapTarget, palette, radius, space } from './tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'blue' | 'brand' | 'danger' | 'gold' | 'ghost';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: IconName;
  size?: 'lg' | 'md' | 'sm';
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

const skins: Record<
  Exclude<ButtonVariant, 'ghost'>,
  { face: string; shade: string; text: string; border?: string }
> = {
  primary: { face: color.correct, shade: color.correctShade, text: color.bone },
  blue: { face: palette.blue, shade: palette.blueShade, text: color.bone },
  brand: { face: color.brand, shade: color.brandShade, text: color.bone },
  danger: { face: color.danger, shade: color.dangerShade, text: color.bone },
  gold: { face: color.gold, shade: color.goldShade, text: color.ink },
  secondary: { face: color.background, shade: color.line, text: color.text, border: color.line },
};

const disabledSkin = { face: color.line, shade: color.lineShade, text: color.textFaint };

const heights = { lg: 58, md: 50, sm: minTapTarget } as const;

/**
 * The chunky button.
 *
 * Uppercase, heavy, and sitting on a ledge it visibly presses into, with a
 * light haptic on touch-down so it feels like a physical key. Primary is green
 * because green means go everywhere in this app — it is also the colour of a
 * correct guess.
 */
export function Button({
  label,
  onPress,
  variant = 'secondary',
  disabled = false,
  icon,
  size = 'md',
  accessibilityHint,
  style,
}: ButtonProps) {
  const haptics = useHaptics();

  if (variant === 'ghost') {
    return (
      <Raised
        face="transparent"
        shade="transparent"
        ledge={0}
        onPress={onPress}
        onPressIn={() => haptics.select()}
        disabled={disabled}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        style={style}
        faceStyle={[styles.face, { minHeight: heights[size] }]}
      >
        <Content label={label} icon={icon} text={disabled ? color.textFaint : color.focus} size={size} />
      </Raised>
    );
  }

  const skin = disabled ? disabledSkin : skins[variant];

  return (
    <Raised
      face={skin.face}
      shade={skin.shade}
      border={disabled ? undefined : 'border' in skin ? skin.border : undefined}
      onPress={onPress}
      onPressIn={() => haptics.select()}
      disabled={disabled}
      radius={radius.md}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={style}
      faceStyle={[styles.face, { minHeight: heights[size] }]}
    >
      <Content label={label} icon={icon} text={skin.text} size={size} />
    </Raised>
  );
}

function Content({
  label,
  icon,
  text,
  size,
}: {
  label: string;
  icon?: IconName;
  text: string;
  size: 'lg' | 'md' | 'sm';
}) {
  return (
    <View style={styles.content}>
      {icon ? <Icon name={icon} size={size === 'sm' ? 18 : 22} color={text} /> : null}
      <Text
        variant="label"
        style={[styles.label, size === 'lg' && styles.labelLarge, { color: text }]}
        numberOfLines={1}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  label: {
    letterSpacing: 0.8,
    fontSize: 16,
  },
  labelLarge: {
    fontSize: 18,
    letterSpacing: 1,
  },
});
