import { StyleSheet, View } from 'react-native';
import { Tap } from './Tap';
import { Text } from './Text';
import { color, font, minTapTarget, radius, space } from './tokens';

export type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  /** radio for one-of-many, checkbox for many-of-many. */
  role?: 'radio' | 'checkbox';
  /** A leading emoji. Colourful on iOS, which is the point. */
  emoji?: string;
  /** Second line under the label, for choices that need a word of explanation. */
  detail?: string;
  /** Stretch to share a row equally with its siblings. */
  grow?: boolean;
};

/**
 * A choice. Selected flips to solid white with dark text — the filter-chip
 * look — so the pick is obvious at a glance on a dark screen.
 */
export function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
  role = 'radio',
  emoji,
  detail,
  grow = false,
}: ChipProps) {
  const tall = Boolean(detail);

  return (
    <Tap
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected } : { checked: selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={grow ? styles.grow : null}
      contentStyle={[
        styles.face,
        tall ? styles.faceTall : styles.facePill,
        { backgroundColor: selected ? color.bone : color.surface },
        grow && styles.fill,
      ]}
    >
      <View style={styles.row}>
        {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
        <Text style={[styles.label, { color: selected ? color.ink : color.text }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {detail ? (
        <Text
          variant="caption"
          align="center"
          numberOfLines={2}
          style={{ color: selected ? '#4A4A55' : color.textMuted }}
        >
          {detail}
        </Text>
      ) : null}
    </Tap>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  fill: { flexGrow: 1 },
  face: {
    minHeight: minTapTarget,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  facePill: { borderRadius: radius.pill, paddingVertical: space.sm },
  faceTall: { borderRadius: radius.md, paddingVertical: space.md - 2, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontFamily: font.heavy, fontSize: 15, lineHeight: 20 },
  emoji: { fontSize: 18, lineHeight: 24 },
});
