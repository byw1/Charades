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
  /** The head colour. Purple is Dex; anything else is Dex in costume. */
  tint?: string;
};

const INK = color.ink;
const CHEEK = '#FF7FB0';

/**
 * Dex. A round head with a card stuck to its forehead — the game explained in
 * one picture — drawn as a sticker: a thick white border, an ink outline, flat
 * colour. It reads on the dark canvas, on a neon card and at icon size.
 *
 * Dex reacts: excited at a win, sad at a bad round, sleepy on the pause screen.
 * It bobs and blinks on its own unless the phone asks for reduced motion.
 */
export function Mascot({
  mood = 'happy',
  size = 120,
  animated = true,
  glyph = '?',
  tint = palette.purple,
}: MascotProps) {
  const reduced = useReducedMotion();
  const live = animated && !reduced;

  const [bob] = useState(() => new Animated.Value(0));
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    if (!live) {
      bob.setValue(0);
      return;
    }

    const speed = mood === 'excited' ? 380 : mood === 'sleepy' ? 1600 : 900;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: speed, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: speed, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
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

  const lift = mood === 'excited' ? 9 : 4;
  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -lift * (size / 120)] });
  const rotate = bob.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', mood === 'excited' ? '4deg' : '2deg'] });

  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel="Dex, the Deckhead mascot">
      <Animated.View style={{ flex: 1, transform: [{ translateY }, { rotate }] }}>
        <Svg width={size} height={size} viewBox="0 0 120 120">
          {/* Sticker border: the whole silhouette, fat and white, underneath. */}
          <G fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={12} strokeLinejoin="round">
            <Circle cx={60} cy={72} r={40} />
            <G transform="rotate(-9 60 30)">
              <Rect x={40} y={5} width={40} height={50} rx={9} />
            </G>
          </G>

          <Circle cx={60} cy={72} r={40} fill={tint} stroke={INK} strokeWidth={4} />
          <Ellipse cx={38} cy={66} rx={5} ry={10} fill="#FFFFFF" opacity={0.22} />

          <G transform="rotate(-9 60 30)">
            <Rect x={40} y={5} width={40} height={50} rx={9} fill={palette.yellow} stroke={INK} strokeWidth={4} />
            <SvgText
              x={60}
              y={40}
              fontSize={[...glyph].length > 1 ? 18 : /\p{Extended_Pictographic}/u.test(glyph) ? 24 : 30}
              fontFamily={font.display}
              fontWeight="800"
              fill={INK}
              textAnchor="middle"
            >
              {glyph}
            </SvgText>
          </G>

          <Ellipse cx={34} cy={90} rx={6} ry={4} fill={CHEEK} />
          <Ellipse cx={86} cy={90} rx={6} ry={4} fill={CHEEK} />

          <Eyes mood={mood} blinking={blinking} />
          <Mouth mood={mood} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const line = { stroke: INK, strokeWidth: 4, strokeLinecap: 'round' as const, fill: 'none' };

function Eyes({ mood, blinking }: { mood: MascotMood; blinking: boolean }) {
  if (mood === 'excited') return <Path d="M39 80 Q46 71 53 80 M67 80 Q74 71 81 80" {...line} />;
  if (mood === 'sleepy' || blinking) return <Path d="M39 78 Q46 84 53 78 M67 78 Q74 84 81 78" {...line} />;

  const look = mood === 'thinking' ? { x: 2, y: -3 } : mood === 'sad' ? { x: 0, y: 3 } : { x: 0, y: 0 };
  const tall = mood === 'wow' ? 10 : 8;

  return (
    <G>
      {mood === 'sad' ? <Path d="M38 65 L52 69 M82 65 L68 69" {...line} strokeWidth={3.5} /> : null}
      <Ellipse cx={46 + look.x} cy={77 + look.y} rx={6} ry={tall} fill={INK} />
      <Circle cx={48 + look.x} cy={73 + look.y} r={2} fill="#FFFFFF" />
      {mood === 'wink' ? (
        <Path d="M67 78 Q74 72 81 78" {...line} />
      ) : (
        <>
          <Ellipse cx={74 + look.x} cy={77 + look.y} rx={6} ry={tall} fill={INK} />
          <Circle cx={76 + look.x} cy={73 + look.y} r={2} fill="#FFFFFF" />
        </>
      )}
    </G>
  );
}

function Mouth({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case 'excited':
      return (
        <G>
          <Path d="M47 92 Q60 110 73 92 Z" fill={INK} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <Ellipse cx={60} cy={101} rx={6} ry={3.5} fill={CHEEK} />
        </G>
      );
    case 'wow':
      return <Ellipse cx={60} cy={99} rx={5} ry={6.5} fill={INK} />;
    case 'sad':
      return <Path d="M50 101 Q60 93 70 101" {...line} />;
    case 'thinking':
      return <Path d="M52 99 Q58 96 68 98" {...line} />;
    case 'sleepy':
      return <Ellipse cx={60} cy={98} rx={3.5} ry={4} fill={INK} />;
    case 'happy':
    case 'wink':
      return <Path d="M49 93 Q60 104 71 93" {...line} />;
  }
}
