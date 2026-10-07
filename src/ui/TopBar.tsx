import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { CircleButton } from './CircleButton';
import { useLayout } from './layout';
import { Text } from './Text';
import { color, font, gutter, minTapTarget, space } from './tokens';

export type TopBarProps = {
  /** Back chevron for drilling in, close for leaving a flow. */
  leading?: 'back' | 'close' | null;
  onLeading?: () => void;
  leadingLabel?: string;
  /** Centred title, or a custom node such as story segments. */
  title?: string;
  center?: ReactNode;
  trailing?: ReactNode;
};

/**
 * The bar across the top of a menu screen: a circle of glass on the left, a
 * bold centred title, room for another circle on the right.
 */
export function TopBar({ leading = 'back', onLeading, leadingLabel, title, center, trailing }: TopBarProps) {
  const { short } = useLayout();

  return (
    <View style={[styles.bar, short && styles.barShort]}>
      <View style={styles.side}>
        {leading && onLeading ? (
          <CircleButton
            icon={leading === 'close' ? 'close' : 'back'}
            label={leadingLabel ?? (leading === 'close' ? 'Close' : 'Back')}
            onPress={onLeading}
          />
        ) : null}
      </View>
      <View style={styles.center}>
        {center ??
          (title ? (
            <Text style={styles.title} align="center" numberOfLines={1} accessibilityRole="header">
              {title}
            </Text>
          ) : null)}
      </View>
      <View style={[styles.side, styles.trailing]}>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: gutter - 4,
    paddingVertical: space.sm,
    minHeight: minTapTarget + space.md,
    gap: space.sm,
  },
  barShort: { paddingVertical: 2, minHeight: minTapTarget + 4 },
  side: { minWidth: minTapTarget, alignItems: 'flex-start' },
  trailing: { alignItems: 'flex-end' },
  center: { flex: 1, justifyContent: 'center' },
  title: { fontFamily: font.heavy, fontSize: 17, lineHeight: 22, color: color.text },
});
