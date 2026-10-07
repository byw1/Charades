import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { color, font, palette } from './tokens';

export type MascotMood = 'happy' | 'excited' | 'wow' | 'sad' | 'thinking' | 'sleepy' | 'wink';

export type MascotProps = {
  mood?: MascotMood;
  size?: number;
  /** Idle bob and blink. Off for small inline uses where it would distract. */
  animated?: boolean;
  /** The glyph on the forehead card. A question mark unless something better fits. */
  glyph?: string;
};

const BODY = palette.purple;
const BODY_SHADE = palette.purpleShade;
const FEATURE = color.ink;
const CHEEK = '#FF8FB1';

/**
 * Dex. A round little head with a card stuck to its forehead, which is the
 * whole game explained in one picture.
 *
 * Dex reacts: excited at a win, sad at a pass streak, sleepy on the pause
 * screen. It bobs and blinks on its own unless the phone asks for reduced
 * motion, in which case it holds still and keeps its expression.
 */
export function Mascot({ mood = 'happy', size = 120, animated = true, glyph = '?' }: MascotProps) {
  const reduced = useReducedMotion();
  const live = animated && !reduced;

  const [bob] = useState(() => new Animated.Value(0));
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    if (!live) {
      bob.setValue(0);
      return;
    }

    const speed = mood === 'excited' ? 420 : mood === 'sleepy' ? 1600 : 900;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: speed,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: speed,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, live, mood]);

  useEffect(() => {
    if (!live) return;

    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeout = setTimeout(
        () => {
          setBlinking(true);
          timeout = setTimeout(() => {
            setBlinking(false);
            schedule();
          }, 130);
        },
        2200 + Math.random() * 2600,
      );
    };
    schedule();
    return () => clearTimeout(timeout);
  }, [live]);

  const lift = mood === 'excited' ? 10 : 5;
  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -lift * (size / 120)] });
  const scaleY = bob.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] });

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Dex, the Deckhead mascot"
    >
      <Animated.View style={{ flex: 1, transform: [{ translateY }, { scaleY }] }}>
        <Svg width={size} height={size} viewBox="0 0 120 120">
          {/* Feet and ledge, so Dex sits on the same kind of shelf as the buttons. */}
          <Ellipse cx={44} cy={110} rx={10} ry={6} fill={BODY_SHADE} />
          <Ellipse cx={76} cy={110} rx={10} ry={6} fill={BODY_SHADE} />
          <Circle cx={60} cy={72} r={42} fill={BODY_SHADE} />
          <Circle cx={60} cy={68} r={42} fill={BODY} />
          <Ellipse cx={30} cy={70} rx={6} ry={11} fill="#FFFFFF" opacity={0.18} />

          {/* The card on the forehead. */}
          <G transform="rotate(-8 60 32)">
            <Rect x={39} y={5} width={42} height={54} rx={9} fill={color.brandShade} />
            <Rect x={39} y={3} width={42} height={54} rx={9} fill="#FFFFFF" stroke={color.line} strokeWidth={1.5} />
            <Rect x={43.5} y={7.5} width={33} height={45} rx={6} fill={color.brand} />
            <SvgText
              x={60}
              y={40}
              fontSize={glyph.length > 1 ? 18 : 28}
              fontFamily={font.black}
              fontWeight="900"
              fill="#FFFFFF"
              textAnchor="middle"
            >
              {glyph}
            </SvgText>
          </G>

          <Ellipse cx={31} cy={90} rx={6.5} ry={4} fill={CHEEK} opacity={0.85} />
          <Ellipse cx={89} cy={90} rx={6.5} ry={4} fill={CHEEK} opacity={0.85} />

          <Eyes mood={mood} blinking={blinking} />
          <Mouth mood={mood} />
        </Svg>
      </Animated.View>
    </View>
  );
}

function Eyes({ mood, blinking }: { mood: MascotMood; blinking: boolean }) {
  const line = {
    stroke: FEATURE,
    strokeWidth: 4,
    strokeLinecap: 'round' as const,
    fill: 'none',
  };

  if (mood === 'excited') {
    return <Path d="M37 79 Q45 70 53 79 M67 79 Q75 70 83 79" {...line} />;
  }

  if (mood === 'sleepy' || blinking) {
    return <Path d="M37 77 Q45 83 53 77 M67 77 Q75 83 83 77" {...line} />;
  }

  // Where the pupils look, and whether the brows tilt.
  const look = mood === 'thinking' ? { x: 2, y: -3 } : mood === 'sad' ? { x: 0, y: 3 } : { x: 1, y: 1 };

  return (
    <G>
      {mood === 'sad' ? <Path d="M36 64 L52 68 M84 64 L68 68" {...line} strokeWidth={3.5} /> : null}

      <Ellipse cx={45} cy={76} rx={9.5} ry={mood === 'wow' ? 12 : 10.5} fill="#FFFFFF" />
      <Circle cx={45 + look.x} cy={77 + look.y} r={5.2} fill={FEATURE} />
      <Circle cx={47 + look.x} cy={74.5 + look.y} r={1.8} fill="#FFFFFF" />

      {mood === 'wink' ? (
        <Path d="M67 78 Q75 72 83 78" {...line} />
      ) : (
        <>
          <Ellipse cx={75} cy={76} rx={9.5} ry={mood === 'wow' ? 12 : 10.5} fill="#FFFFFF" />
          <Circle cx={75 + look.x} cy={77 + look.y} r={5.2} fill={FEATURE} />
          <Circle cx={77 + look.x} cy={74.5 + look.y} r={1.8} fill="#FFFFFF" />
        </>
      )}
    </G>
  );
}

function Mouth({ mood }: { mood: MascotMood }) {
  const line = {
    stroke: FEATURE,
    strokeWidth: 4,
    strokeLinecap: 'round' as const,
    fill: 'none',
  };

  switch (mood) {
    case 'excited':
      return (
        <G>
          <Path d="M47 91 Q60 109 73 91 Z" fill={FEATURE} />
          <Ellipse cx={60} cy={100} rx={6} ry={3.5} fill={CHEEK} />
        </G>
      );
    case 'wow':
      return <Ellipse cx={60} cy={98} rx={5.5} ry={7} fill={FEATURE} />;
    case 'sad':
      return <Path d="M50 100 Q60 92 70 100" {...line} />;
    case 'thinking':
      return <Path d="M52 98 Q58 95 68 97" {...line} />;
    case 'sleepy':
      return <Ellipse cx={60} cy={97} rx={3.5} ry={4} fill={FEATURE} />;
    case 'happy':
    case 'wink':
      return <Path d="M49 92 Q60 103 71 92" {...line} />;
  }
}
