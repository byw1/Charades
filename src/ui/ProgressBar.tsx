import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { color, radius } from './tokens';

export type ProgressBarProps = {
  /** 0 to 1. */
  value: number;
  tint?: string;
  height?: number;
  /** Track colour. Defaults to the light line grey. */
  track?: string;
};

/**
 * A fat, rounded progress bar with a highlight stripe, like a lesson bar.
 * Springs to its new value rather than jumping.
 */
export function ProgressBar({ value, tint = color.correct, height = 16, track = color.line }: ProgressBarProps) {
  const reduced = useReducedMotion();
  const clamped = Math.min(1, Math.max(0, value));
  const [width] = useState(() => new Animated.Value(clamped));

  useEffect(() => {
    if (reduced) {
      width.setValue(clamped);
      return;
    }
    // Width cannot use the native driver; this is a handful of frames on a
    // screen change, not a per-frame timer.
    const animation = Animated.spring(width, {
      toValue: clamped,
      friction: 8,
      tension: 90,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [clamped, reduced, width]);

  return (
    <View
      style={[styles.track, { height, backgroundColor: track }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: tint,
            width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      >
        <View style={[styles.shine, { height: Math.max(3, height * 0.25), top: height * 0.2 }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  shine: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});
