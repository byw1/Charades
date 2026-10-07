import { useState, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  type AccessibilityRole,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useHaptics } from '@/hooks/useHaptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export type TapProps = {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** A light tick on touch-down. On for anything that commits to an action. */
  haptic?: boolean;
  /** How far it squishes. Big surfaces squish less than small buttons. */
  squish?: number;
  /** Layout: size, margin, flex. Applied to the pressable. */
  style?: StyleProp<ViewStyle>;
  /** Look: background, radius, padding. Applied to the part that squishes. */
  contentStyle?: StyleProp<ViewStyle>;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  hitSlop?: number;
  testID?: string;
};

/**
 * Anything you can tap.
 *
 * Squishes on touch-down and springs back on release, with an optional haptic
 * tick — the press feel of the camera apps this is meant to sit next to on a
 * home screen. Under reduced motion it dims instead of moving.
 */
export function Tap({
  children,
  onPress,
  onLongPress,
  disabled = false,
  haptic = true,
  squish = 0.94,
  style,
  contentStyle,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  hitSlop,
  testID,
}: TapProps) {
  const haptics = useHaptics();
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const [dimmed, setDimmed] = useState(false);

  const to = (value: number) =>
    Animated.spring(scale, { toValue: value, friction: 6, tension: 260, useNativeDriver: true }).start();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      onPressIn={() => {
        if (haptic) haptics.select();
        if (reduced) setDimmed(true);
        else to(squish);
      }}
      onPressOut={() => {
        if (reduced) setDimmed(false);
        else to(1);
      }}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, ...accessibilityState }}
      hitSlop={hitSlop}
      style={style}
      testID={testID}
    >
      <Animated.View style={[contentStyle, { transform: [{ scale }], opacity: dimmed ? 0.7 : 1 }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
