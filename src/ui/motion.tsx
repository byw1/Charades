import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export type PopInProps = {
  children: ReactNode;
  /** Stagger siblings by giving each a slightly later delay. */
  delay?: number;
  /** Where it springs from: a small scale for a pop, a drop for lists. */
  from?: 'pop' | 'rise';
  style?: StyleProp<ViewStyle>;
};

/**
 * Springs its children in on mount.
 *
 * The app's entrance. A slight overshoot gives things a bit of bounce without
 * slowing anyone down — everything lands within about a third of a second.
 * With reduced motion on, children simply appear.
 */
export function PopIn({ children, delay = 0, from = 'pop', style }: PopInProps) {
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }

    const animation = Animated.spring(progress, {
      toValue: 1,
      delay,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress, reduced]);

  const transform =
    from === 'pop'
      ? [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }]
      : [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }];

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
          transform,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * A gentle, endless pulse, for the one thing on a screen that wants a tap.
 */
export function Pulse({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const [value] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, value]);

  return (
    <Animated.View
      style={[
        style,
        { transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}
