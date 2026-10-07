import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Mascot } from './Mascot';
import { Text } from './Text';
import { color, space } from './tokens';

/** What the card on Dex's forehead flips through, one per hop. */
export const LOADER_GLYPHS = ['?', '🍕', '🎤', '⭐', '🏀', '🍿', '🎮', '🦁'] as const;

/** Said while waiting, one after another. Short enough to read mid-hop. */
export const LOADER_LINES = ['Shuffling the decks', 'Waking Dex up', 'Finding the good cards', 'Stretching first'] as const;

const HOP_MS = 520;
const LINE_MS = 1800;

export type LoaderProps = {
  /** Fixed words instead of the rotating ones. */
  label?: string;
  /** Dex's size. The rest scales with it. */
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Loading, as a little show instead of a spinner.
 *
 * Dex hops on the spot: squashes as it lands, stretches as it leaves, and its
 * shadow shrinks as it rises. Every hop flips the forehead card to a new
 * emoji, the way a round flips to a new card. Three dots bounce underneath and
 * the line beneath changes now and then. Under reduced motion it is a still
 * Dex and a line of text.
 */
export function Loader({ label, size = 96, style }: LoaderProps) {
  const reduced = useReducedMotion();
  const [hop] = useState(() => new Animated.Value(0));
  const [dots] = useState(() => new Animated.Value(0));
  const [glyph, setGlyph] = useState(0);
  const [line, setLine] = useState(0);

  useEffect(() => {
    if (reduced) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hop, { toValue: 1, duration: HOP_MS / 2, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(hop, { toValue: 0, duration: HOP_MS / 2, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    const dotLoop = Animated.loop(Animated.timing(dots, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    dotLoop.start();

    // A new card at the top of every hop, while Dex is in the air.
    const flip = setInterval(() => setGlyph((current) => (current + 1) % LOADER_GLYPHS.length), HOP_MS);
    return () => {
      loop.stop();
      dotLoop.stop();
      clearInterval(flip);
    };
  }, [dots, hop, reduced]);

  useEffect(() => {
    if (reduced || label) return;
    const id = setInterval(() => setLine((current) => (current + 1) % LOADER_LINES.length), LINE_MS);
    return () => clearInterval(id);
  }, [label, reduced]);

  const rise = size * 0.28;

  return (
    <View style={[styles.wrap, style]} accessible accessibilityRole="progressbar" accessibilityLabel={label ?? 'Loading'}>
      <View style={{ height: size + rise, justifyContent: 'flex-end', alignItems: 'center' }}>
        <Animated.View
          style={[
            styles.shadow,
            {
              width: size * 0.62,
              height: size * 0.1,
              borderRadius: size,
              transform: [{ scaleX: hop.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) }],
              opacity: hop.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.06] }),
            },
          ]}
        />
        <Animated.View
          style={{
            position: 'absolute',
            bottom: size * 0.04,
            transformOrigin: '50% 100%',
            transform: [
              { translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -rise] }) },
              { scaleY: hop.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.9, 1.04, 1] }) },
              { scaleX: hop.interpolate({ inputRange: [0, 0.15, 1], outputRange: [1.08, 0.97, 1] }) },
              { rotate: hop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-5deg'] }) },
            ],
          }}
        >
          <Mascot size={size} mood="excited" animated={false} glyph={LOADER_GLYPHS[glyph]} />
        </Animated.View>
      </View>

      <View style={styles.dots}>
        {[0, 1, 2].map((i) => {
          const phase = Animated.modulo(Animated.add(dots, 1 - i * 0.18), 1);
          return (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  transform: [{ translateY: phase.interpolate({ inputRange: [0, 0.25, 0.5, 1], outputRange: [0, -6, 0, 0] }) }],
                  opacity: phase.interpolate({ inputRange: [0, 0.25, 0.5, 1], outputRange: [0.5, 1, 0.5, 0.5] }),
                },
              ]}
            />
          );
        })}
      </View>

      <Text variant="label" tone="muted" align="center">
        {label ?? LOADER_LINES[line]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  // A pool of light on the dark canvas, not a drop shadow, which would vanish.
  shadow: { backgroundColor: '#FFFFFF' },
  dots: { flexDirection: 'row', gap: 6, paddingTop: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.brand },
});
