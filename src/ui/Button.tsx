import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';
import { color, font, radius, space } from './tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'blue' | 'danger' | 'white' | 'ghost';

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

const skins: Record<ButtonVariant, { face: string; text: string }> = {
  primary: { face: color.brand, text: color.ink },
  secondary: { face: color.glass, text: color.text },
  blue: { face: color.focus, text: color.ink },
  danger: { face: color.danger, text: color.bone },
  white: { face: color.bone, text: color.ink },
  ghost: { face: 'transparent', text: color.textMuted },
};

const heights = { lg: 58, md: 50, sm: 42 } as const;

/**
 * A fat pill. Yellow means "do the thing", and there is only ever one yellow
 * button on a screen. Everything else is glass.
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
  const skin = skins[variant];
  const face = disabled && variant !== 'ghost' ? color.surfaceRaised : skin.face;
  const text = disabled ? color.textFaint : skin.text;

  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      squish={size === 'lg' ? 0.96 : 0.94}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={style}
      contentStyle={[styles.face, { minHeight: heights[size], backgroundColor: face }]}
    >
      <View style={styles.content}>
        {icon ? <Icon name={icon} size={size === 'sm' ? 18 : 20} color={text} weight={2.75} /> : null}
        <Text style={[styles.label, size === 'lg' && styles.labelLarge, { color: text }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  face: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  label: { fontFamily: font.heavy, fontSize: 16, lineHeight: 20 },
  labelLarge: { fontSize: 18, lineHeight: 22 },
});
