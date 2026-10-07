import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityRole,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ledge as ledgeHeight, radius as radii } from './tokens';

export type RaisedProps = {
  children: ReactNode;
  /** The face colour. */
  face: string;
  /** The ledge underneath, normally a darker shade of the face. */
  shade: string;
  /** Optional border on the face, for white surfaces that need an edge. */
  border?: string;
  onPress?: () => void;
  onPressIn?: () => void;
  disabled?: boolean;
  radius?: number;
  /** Lift the face this high above its ledge. */
  ledge?: number;
  style?: StyleProp<ViewStyle>;
  faceStyle?: StyleProp<ViewStyle>;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  testID?: string;
};

/**
 * A surface that sits on a solid ledge and presses down into it.
 *
 * The signature shape of the whole interface. The ledge is drawn as its own
 * layer under the face rather than as a bottom border, so pressing moves the
 * face down without the surrounding layout shifting by a pixel.
 */
export function Raised({
  children,
  face,
  shade,
  border,
  onPress,
  onPressIn,
  disabled = false,
  radius = radii.md,
  ledge = ledgeHeight,
  style,
  faceStyle,
  accessibilityRole,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  testID,
}: RaisedProps) {
  const body = (pressed: boolean) => (
    <>
      <View
        style={[styles.ledge, { top: ledge, borderRadius: radius, backgroundColor: shade }]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.face,
          {
            borderRadius: radius,
            backgroundColor: face,
            transform: [{ translateY: pressed ? ledge : 0 }],
          },
          border ? { borderWidth: 2, borderColor: border } : null,
          faceStyle,
        ]}
      >
        {children}
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View style={[{ paddingBottom: ledge }, style]} testID={testID}>
        {body(false)}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      disabled={disabled}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, ...accessibilityState }}
      style={[{ paddingBottom: ledge }, style]}
      testID={testID}
    >
      {({ pressed }) => body(pressed && !disabled)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ledge: {
    ...StyleSheet.absoluteFill,
    bottom: 0,
  },
  face: {
    // Fills the container when a row stretches it to match a taller sibling,
    // so the ledge never shows as a slab underneath a shorter face.
    flexGrow: 1,
    overflow: 'hidden',
  },
});
