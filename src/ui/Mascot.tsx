import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { color, font, palette } from './tokens';

export type MascotMood = 'happy' | 'excited' | 'wow' | 'sad' | 'thinking' | 'sleepy' | 'wink';

export type MascotProps = {
  mood?: MascotMood;
  size?: number;
  /** Idle bounce, blinks, glances and card wiggles. Off for small inline uses. */
  animated?: boolean;
  /** The glyph on the forehead card. A question mark unless something better fits. */
  glyph?: string;
  /** The head colour. Purple is Dex; anything else is Dex in costume. */
  tint?: string;
  /**
   * Tap Dex and Dex reacts: a boing, a grin and a spin of the card. Off by
   * default, because Dex often sits inside something that is itself a button.
   */
  poke?: boolean;
};

const INK = color.ink;
const CHEEK = '#FF7FB0';

/** Where the card pivots: the middle of its bottom edge, stuck to the head. */
const CARD_PIVOT = { x: 64, y: 55 };

/**
 * Dex. A round head with a card stuck to its forehead — the game explained in
 * one picture — drawn as a sticker: a thick white border, an ink outline, flat
 * colour. It reads on the dark canvas, on a neon card and at icon size.
 *
 * Dex is alive: a squashy little bounce, blinks, glances about, and every so
 * often the card on its forehead wobbles like it is about to fall off. Moods
 * change how: excited bounces higher and faster, sleepy breathes slowly with
 * z's drifting off. All of it stops under reduced motion.
 */
export function Mascot({
  mood: moodProp = 'happy',
  size = 120,
  animated = true,
  glyph = '?',
  tint = palette.purple,
  poke = false,
}: MascotProps) {
  const reduced = useReducedMotion();
  const live = animated && !reduced;

  const [bob] = useState(() => new Animated.Value(0));
  const [wiggle] = useState(() => new Animated.Value(0));
  const [boing] = useState(() => new Animated.Value(0));
  const [blinking, setBlinking] = useState(false);
  const [look, setLook] = useState(0);
  const [poked, setPoked] = useState(false);

  // A poke borrows the excited face for a moment.
  const mood: MascotMood = poked ? 'excited' : moodProp;

  // The bounce. Excited is quick and high, sleepy is slow breathing.
  useEffect(() => {
    if (!live) {
      bob.setValue(0);
      return;
    }

    const speed = mood === 'excited' ? 340 : mood === 'sleepy' ? 1700 : 850;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: speed, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: speed, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, live, mood]);

  // Now and then the card wobbles on its forehead.
  useEffect(() => {
    if (!live || mood === 'sleepy') return;

    const wobble = Animated.loop(
      Animated.sequence([
        Animated.delay(2600),
        Animated.timing(wiggle, { toValue: 1, duration: 110, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: -0.8, duration: 150, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: 0.4, duration: 130, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: 0, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.delay(1900),
      ]),
    );
    wobble.start();
    return () => wobble.stop();
  }, [live, mood, wiggle]);

  // Blinks, at a human, uneven rhythm.
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

  // Glances: left, right, back to you.
  useEffect(() => {
    if (!live) return;

    let timeout: ReturnType<typeof setTimeout>;
    const glance = () => {
      timeout = setTimeout(
        () => {
          setLook((current) => (current !== 0 ? 0 : Math.random() < 0.5 ? -1 : 1));
          glance();
        },
        1400 + Math.random() * 2400,
      );
    };
    glance();
    return () => clearTimeout(timeout);
  }, [live]);

  const onPoke = () => {
    if (reduced) return;
    setPoked(true);
    boing.setValue(0);
    Animated.sequence([
      Animated.spring(boing, { toValue: 1, friction: 3, tension: 220, useNativeDriver: true }),
      Animated.timing(boing, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(() => setPoked(false));
  };

  const k = size / 120;
  const lift = (mood === 'excited' ? 10 : mood === 'sleepy' ? 1.5 : 4) * k;
  // Squash on the ground, stretch in the air.
  const squash = mood === 'sleepy' ? 0.015 : mood === 'excited' ? 0.06 : 0.035;

  const body = {
    transform: [
      { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -lift] }) },
      { scaleX: bob.interpolate({ inputRange: [0, 0.25, 1], outputRange: [1 + squash, 1, 1 - squash / 2] }) },
      { scaleY: bob.interpolate({ inputRange: [0, 0.25, 1], outputRange: [1 - squash, 1, 1 + squash / 2] }) },
      { scale: boing.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) },
      { rotate: boing.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-8deg'] }) },
    ],
  };

  const card = {
    transformOrigin: `${(CARD_PIVOT.x / 120) * 100}% ${(CARD_PIVOT.y / 120) * 100}%`,
    transform: [
      {
        rotate: Animated.add(wiggle, boing.interpolate({ inputRange: [0, 1], outputRange: [0, 2] })).interpolate({
          inputRange: [-1, 0, 1, 2],
          outputRange: ['-7deg', '0deg', '7deg', '30deg'],
        }),
      },
    ],
  };

  const art = (
    <Animated.View style={[styles.fill, body]}>
      {/* The head, the face and both sticker borders. */}
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <G fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={12} strokeLinejoin="round">
          <Ellipse cx={60} cy={73} rx={42} ry={39} />
          <G transform="rotate(-9 60 30)">
            <Rect x={40} y={5} width={40} height={50} rx={9} />
          </G>
        </G>

        <Ellipse cx={60} cy={73} rx={42} ry={39} fill={tint} stroke={INK} strokeWidth={3.5} />
        {/* A soft shine, and a lighter belly of colour, so the head looks round. */}
        <Ellipse cx={60} cy={86} rx={30} ry={20} fill="#FFFFFF" opacity={0.08} />
        <Ellipse cx={34} cy={60} rx={5} ry={9} fill="#FFFFFF" opacity={0.28} transform="rotate(20 34 60)" />

        <Ellipse cx={30} cy={93} rx={8} ry={5} fill={CHEEK} opacity={0.85} />
        <Ellipse cx={90} cy={93} rx={8} ry={5} fill={CHEEK} opacity={0.85} />

        <Eyes mood={mood} blinking={blinking} look={look} />
        <Mouth mood={mood} />
      </Svg>

      {/* The card, on its own layer so it can wobble on the forehead. */}
      <Animated.View style={[StyleSheet.absoluteFill, card]} pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 120 120">
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
        </Svg>
      </Animated.View>

      {mood === 'sleepy' && live ? <Snooze size={size} /> : null}
    </Animated.View>
  );

  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel="Dex, the Charades mascot">
      {poke ? (
        <Pressable onPress={onPoke} style={styles.fill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {art}
        </Pressable>
      ) : (
        art
      )}
    </View>
  );
}

/** Three z's drifting up and away, staggered. */
function Snooze({ size }: { size: number }) {
  const [drift] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(drift, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [drift]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[0, 1, 2].map((i) => {
        // Each z is a third of a cycle behind the last.
        const phase = Animated.modulo(Animated.add(drift, i / 3), 1);
        return (
          <Animated.Text
            key={i}
            style={[
              styles.z,
              {
                fontSize: size * (0.12 + i * 0.03),
                right: size * 0.02,
                top: size * 0.3,
                opacity: phase.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 0.8, 0] }),
                transform: [
                  { translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.35] }) },
                  { translateX: phase.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.12] }) },
                ],
              },
            ]}
          >
            z
          </Animated.Text>
        );
      })}
    </View>
  );
}

const line = { stroke: INK, strokeWidth: 4, strokeLinecap: 'round' as const, fill: 'none' };

function Eyes({ mood, blinking, look }: { mood: MascotMood; blinking: boolean; look: number }) {
  // Happy-closed eyes: little upside-down U's.
  if (mood === 'excited') return <Path d="M37 84 Q44 74 51 84 M69 84 Q76 74 83 84" {...line} />;
  if (mood === 'sleepy' || blinking) return <Path d="M37 82 Q44 88 51 82 M69 82 Q76 88 83 82" {...line} />;

  // Thinking looks up and away; sad looks down; otherwise Dex glances about.
  const at = mood === 'thinking' ? { x: 2, y: -3 } : mood === 'sad' ? { x: 0, y: 3 } : { x: look * 2.5, y: 0 };
  const tall = mood === 'wow' ? 11 : 9.5;

  const eye = (cx: number) => (
    <G>
      <Ellipse cx={cx + at.x} cy={81 + at.y} rx={7.5} ry={tall} fill={INK} />
      {/* Two sparkles: the big one makes the eye, the small one makes it shine. */}
      <Circle cx={cx + 2.6 + at.x} cy={76.5 + at.y} r={3} fill="#FFFFFF" />
      <Circle cx={cx - 2.4 + at.x} cy={85.5 + at.y} r={1.4} fill="#FFFFFF" />
    </G>
  );

  return (
    <G>
      {mood === 'sad' ? <Path d="M35 70 L49 65 M85 70 L71 65" {...line} strokeWidth={3} /> : null}
      {eye(44)}
      {mood === 'wink' ? <Path d="M69 82 Q76 75 83 82" {...line} /> : eye(76)}
    </G>
  );
}

function Mouth({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case 'excited':
      return (
        <G>
          <Path d="M50 94 Q60 108 70 94 Z" fill={INK} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
          <Ellipse cx={60} cy={101.5} rx={5} ry={3} fill={CHEEK} />
        </G>
      );
    case 'wow':
      return <Ellipse cx={60} cy={100} rx={4.5} ry={5.5} fill={INK} />;
    case 'sad':
      return <Path d="M53 101 Q60 96 67 101" {...line} />;
    case 'thinking':
      return <Path d="M54 99 Q59 97 66 98" {...line} />;
    case 'sleepy':
      return <Ellipse cx={60} cy={98} rx={3} ry={3.5} fill={INK} />;
    case 'happy':
    case 'wink':
      // A little cat smile.
      return <Path d="M52 95 Q56 100.5 60 96 Q64 100.5 68 95" {...line} strokeWidth={3.5} />;
  }
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  z: { position: 'absolute', fontFamily: font.display, color: '#FFFFFF' },
});
