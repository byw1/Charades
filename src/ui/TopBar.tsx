import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { color, minTapTarget, space } from './tokens';

export type TopBarProps = {
  /** Back chevron for drilling in, close for leaving a flow. */
  leading?: 'back' | 'close' | null;
  onLeading?: () => void;
  leadingLabel?: string;
  /** Centred title, or a custom node such as a progress bar. */
  title?: string;
  center?: ReactNode;
  trailing?: ReactNode;
};

/**
 * The bar across the top of every menu screen. Quiet on purpose: one icon
 * button, one title, and the screen below gets the attention.
 */
export function TopBar({
  leading = 'back',
  onLeading,
  leadingLabel,
  title,
  center,
  trailing,
}: TopBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {leading && onLeading ? (
          <IconButton
            icon={leading === 'close' ? 'close' : 'back'}
            label={leadingLabel ?? (leading === 'close' ? 'Close' : 'Back')}
            onPress={onLeading}
          />
        ) : null}
      </View>

      <View style={styles.center}>
        {center ??
          (title ? (
            <Text variant="heading" align="center" numberOfLines={1}>
              {title}
            </Text>
          ) : null)}
      </View>

      <View style={[styles.side, styles.trailing]}>{trailing}</View>
    </View>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  tint = color.textFaint,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={space.sm}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Icon name={icon} size={26} color={tint} weight={3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: minTapTarget + space.md,
    gap: space.sm,
  },
  side: {
    minWidth: minTapTarget,
    alignItems: 'flex-start',
  },
  trailing: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  iconButton: {
    width: minTapTarget,
    height: minTapTarget,
    borderRadius: minTapTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: color.backgroundSoft,
  },
});
