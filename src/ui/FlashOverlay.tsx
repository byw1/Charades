import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Outcome } from '@/game/types';
import { Icon } from './Icon';
import { color, font } from './tokens';

export type FlashOverlayProps = {
  outcome: Outcome;
};

const LINES = {
  correct: ['Got it!', 'Nailed it!', 'Yes!', 'Boom!', 'Nice!'],
  pass: ['Pass', 'Next one', 'Skip it'],
} as const;

/**
 * The full-screen state flash.
 *
 * The signature element. Correct and pass each take over the whole display so
 * the group reads the result from across the room without hunting for a small
 * indicator. The word and icon pop in with a spring; the word is there for
 * anyone who cannot rely on colour alone.
 */
export function FlashOverlay({ outcome }: FlashOverlayProps) {
  const reduced = useReducedMotion();
  const [pop] = useState(() => new Animated.Value(reduced ? 1 : 0));
  const [line] = useState(() => pick(LINES[outcome]));

  useEffect(() => {
    if (reduced) return;
    const animation = Animated.spring(pop, {
      toValue: 1,
      friction: 5,
      tension: 180,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [pop, reduced]);

  const background = outcome === 'correct' ? color.correct : color.pass;

  return (
    <View
      style={[styles.overlay, { backgroundColor: background }]}
      pointerEvents="none"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={outcome === 'correct' ? 'Got it' : 'Pass'}
    >
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
          },
        ]}
      >
        <View style={styles.badge}>
          <Icon name={outcome === 'correct' ? 'check' : 'pass'} size={64} color={background} weight={4} />
        </View>
        <Text style={styles.label} allowFontScaling={false}>
          {line}
        </Text>
      </Animated.View>
    </View>
  );
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? (items[0] as T);
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: {
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: color.bone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: font.black,
    fontSize: 84,
    lineHeight: 96,
    color: color.bone,
    textAlign: 'center',
  },
});
