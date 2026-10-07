import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { color, radius, space } from './tokens';

export type SpeechBubbleProps = {
  children: ReactNode;
  /** Which side the tail points from, toward the mascot. */
  tail?: 'left' | 'bottom';
};

/**
 * What Dex is saying. Short, warm, and never more than a sentence or two.
 */
export function SpeechBubble({ children, tail = 'left' }: SpeechBubbleProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bubble}>
        {typeof children === 'string' ? <Text variant="heading">{children}</Text> : children}
      </View>
      <View
        style={[styles.tail, tail === 'left' ? styles.tailLeft : styles.tailBottom]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexShrink: 1 },
  bubble: {
    backgroundColor: color.background,
    borderWidth: 2,
    borderColor: color.line,
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 4,
  },
  tail: {
    position: 'absolute',
    width: 16,
    height: 16,
    backgroundColor: color.background,
    borderColor: color.line,
    transform: [{ rotate: '45deg' }],
  },
  tailLeft: {
    left: -8,
    top: '50%',
    marginTop: -8,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
  },
  tailBottom: {
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
});
