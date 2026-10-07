import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { color, radius, space } from './tokens';

export type StatTileProps = {
  label: string;
  value: string | number;
  tint: string;
  icon: IconName;
};

/**
 * A result tile: a coloured header strip with the label, and the number below
 * in the same colour. The shape a finished lesson uses to show what you did.
 */
export function StatTile({ label, value, tint, icon }: StatTileProps) {
  return (
    <View
      style={[styles.tile, { borderColor: tint, backgroundColor: tint }]}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text variant="overline" tone="inverse" align="center" style={styles.label}>
        {label.toUpperCase()}
      </Text>
      <View style={styles.body}>
        <Icon name={icon} size={22} color={tint} weight={3} />
        <Text variant="title" style={{ color: tint }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderWidth: 2,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  label: {
    paddingVertical: 4,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: color.background,
    borderRadius: radius.md - 4,
    paddingVertical: space.sm + 2,
  },
});
