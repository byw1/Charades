import { StyleSheet } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Tap } from './Tap';
import { color, minTapTarget } from './tokens';

export type CircleButtonProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** Glass on the dark canvas; scrim over bright full-bleed colour. */
  tone?: 'glass' | 'scrim' | 'brand';
  size?: number;
};

/**
 * A round, translucent icon button that floats over whatever is behind it.
 * The camera-app control: no chrome around it, just a circle of glass.
 */
export function CircleButton({ icon, label, onPress, tone = 'glass', size = minTapTarget }: CircleButtonProps) {
  const background = tone === 'brand' ? color.brand : tone === 'scrim' ? color.scrim : color.glass;
  const tint = tone === 'brand' ? color.ink : color.text;

  return (
    <Tap
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={6}
      contentStyle={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: background }]}
    >
      <Icon name={icon} size={size * 0.48} color={tint} weight={2.75} />
    </Tap>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
