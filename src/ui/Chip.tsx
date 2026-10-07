import { StyleSheet, View } from 'react-native';
import { useHaptics } from '@/hooks/useHaptics';
import { Raised } from './Raised';
import { Text } from './Text';
import { color, minTapTarget, radius, space } from './tokens';

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
 * A choice. Selected chips turn blue, the same way a picked answer does in a
 * quiz app: the colour change is the confirmation, no tick needed.
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
  const haptics = useHaptics();

  return (
    <Raised
      face={selected ? color.focusLight : color.background}
      shade={selected ? color.focus : color.line}
      border={selected ? color.focus : color.line}
      radius={radius.md}
      onPress={onPress}
      onPressIn={() => haptics.select()}
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected } : { checked: selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={grow ? styles.grow : null}
      faceStyle={[styles.face, detail ? styles.faceTall : null]}
    >
      <View style={styles.row}>
        {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
        <Text variant="label" style={{ color: selected ? color.focus : color.text }} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {detail ? (
        <Text variant="caption" tone="muted" align="center" numberOfLines={2}>
          {detail}
        </Text>
      ) : null}
    </Raised>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  face: {
    minHeight: minTapTarget + 4,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  faceTall: { paddingVertical: space.md, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  emoji: { fontSize: 20, lineHeight: 26 },
});
