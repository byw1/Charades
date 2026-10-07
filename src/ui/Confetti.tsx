import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { color, palette } from './tokens';

const COLORS = [palette.yellow, palette.pink, palette.blue, palette.purple, palette.green, palette.orange, '#FFFFFF'];

/**
 * A scattered but repeatable number in [0, 1) for piece i, channel k. Pure, so
 * the layout can be computed during render; nobody can tell the confetti is
 * the same every time, and a stable layout means no re-shuffle on re-render.
 */
function noise(i: number, k: number): number {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

type Piece = {
  x: number;
  drift: number;
  size: number;
  delay: number;
  duration: number;
  spin: number;
  tint: string;
  round: boolean;
};

/**
 * A burst of confetti across the whole screen, once, on mount.
 *
 * Saved for the moments that deserve it — the end of a game — so it still
 * means something when it happens. Pure Animated with the native driver, so it
 * stays smooth on older phones. Skipped entirely under reduced motion.
 */
export function Confetti({ count = 60 }: { count?: number }) {
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: noise(i, 1) * width,
        drift: (noise(i, 2) - 0.5) * 120,
        size: 7 + noise(i, 3) * 7,
        delay: noise(i, 4) * 500,
        duration: 2200 + noise(i, 5) * 1600,
        spin: (noise(i, 6) > 0.5 ? 1 : -1) * (360 + noise(i, 7) * 540),
        tint: COLORS[i % COLORS.length] ?? color.brand,
        round: noise(i, 8) > 0.6,
      })),
    [count, width],
  );

  if (reduced) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((piece, i) => (
        <ConfettiPiece key={i} piece={piece} fall={height + 40} />
      ))}
    </View>
  );
}

function ConfettiPiece({ piece, fall }: { piece: Piece; fall: number }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: piece.duration,
      delay: piece.delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [piece, progress]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: piece.x,
        top: -20,
        width: piece.size,
        height: piece.round ? piece.size : piece.size * 0.5,
        borderRadius: piece.round ? piece.size : 2,
        backgroundColor: piece.tint,
        opacity: progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, fall] }) },
          {
            translateX: progress.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, piece.drift, piece.drift * 0.4],
            }),
          },
          {
            rotate: progress.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', `${piece.spin}deg`],
            }),
          },
        ],
      }}
    />
  );
}
