import { StyleSheet, View } from 'react-native';
import { color } from './tokens';

export type TimerBarProps = {
  /** 1 at the start of the round, 0 at the end. */
  fraction: number;
  /** Turns the bar yellow in the closing seconds. */
  warning?: boolean;
  /** Distance from the top edge. Upright it has to clear the Dynamic Island. */
  top?: number;
};

/**
 * A thin bar along the top edge, like a story's progress — not a number.
 *
 * It must not compete with the word. A bar reads as "how much is left" from
 * across the room without anyone parsing digits, and the holder cannot see it
 * anyway.
 */
export function TimerBar({ fraction, warning = false, top }: TimerBarProps) {
  const clamped = Math.min(1, Math.max(0, fraction));

  return (
    <View style={[styles.wrap, top !== undefined && { top }]} pointerEvents="none">
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: warning ? color.brand : color.bone }]} />
      </View>
    </View>
  );
}

export const TIMER_BAR_HEIGHT = 6;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 14, left: 52, right: 52, zIndex: 5 },
  track: { height: TIMER_BAR_HEIGHT, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.25)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
