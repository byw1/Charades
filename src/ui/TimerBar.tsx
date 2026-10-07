import { StyleSheet, View } from 'react-native';
import { color, radius } from './tokens';

export type TimerBarProps = {
  /** 1 at the start of the round, 0 at the end. */
  fraction: number;
  /** Turns the bar gold in the closing seconds. */
  warning?: boolean;
};

/**
 * A chunky rounded bar along the top, not a number.
 *
 * It must not compete with the word. A bar reads as "how much is left" from
 * across the room without anyone parsing digits, and the holder cannot see it
 * anyway.
 */
export function TimerBar({ fraction, warning = false }: TimerBarProps) {
  const clamped = Math.min(1, Math.max(0, fraction));

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${clamped * 100}%`, backgroundColor: warning ? color.gold : color.bone },
          ]}
        />
      </View>
    </View>
  );
}

export const TIMER_BAR_HEIGHT = 14;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 18,
    left: 56,
    right: 56,
    zIndex: 5,
  },
  track: {
    height: TIMER_BAR_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
