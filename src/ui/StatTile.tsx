import { StyleSheet, View } from 'react-native';
import { onCanvas } from './contrast';
import { Text } from './Text';
import { color, font, radius, space } from './tokens';

export type StatTileProps = {
  label: string;
  value: string | number;
  tint?: string;
  emoji?: string;
};

/** A number worth bragging about: big, coloured, with a small label under it. */
export function StatTile({ label, value, tint = color.text, emoji }: StatTileProps) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.value, { color: onCanvas(tint) }]} numberOfLines={1} adjustsFontSizeToFit>
        {emoji ? `${emoji} ` : ''}
        {value}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    paddingVertical: space.md - 4,
    paddingHorizontal: space.md - 4,
    gap: 2,
  },
  value: { fontFamily: font.display, fontSize: 28, lineHeight: 32 },
});
