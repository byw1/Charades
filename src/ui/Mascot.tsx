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
          <Circle cx={60} cy={72} r={40} />
          <G transform="rotate(-9 60 30)">
            <Rect x={40} y={5} width={40} height={50} rx={9} />
          </G>
        </G>

        <Circle cx={60} cy={72} r={40} fill={tint} stroke={INK} strokeWidth={4} />
        <Ellipse cx={38} cy={66} rx={5} ry={10} fill="#FFFFFF" opacity={0.22} />

        <Ellipse cx={34} cy={90} rx={6} ry={4} fill={CHEEK} />
        <Ellipse cx={86} cy={90} rx={6} ry={4} fill={CHEEK} />

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
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel="Dex, the Deckhead mascot">
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
  if (mood === 'excited') return <Path d="M39 80 Q46 71 53 80 M67 80 Q74 71 81 80" {...line} />;
  if (mood === 'sleepy' || blinking) return <Path d="M39 78 Q46 84 53 78 M67 78 Q74 84 81 78" {...line} />;

  // Thinking looks up and away; sad looks down; otherwise Dex glances about.
  const at = mood === 'thinking' ? { x: 2, y: -3 } : mood === 'sad' ? { x: 0, y: 3 } : { x: look * 2.5, y: 0 };
  const tall = mood === 'wow' ? 10 : 8;

  return (
    <G>
      {mood === 'sad' ? <Path d="M38 65 L52 69 M82 65 L68 69" {...line} strokeWidth={3.5} /> : null}
      <Ellipse cx={46 + at.x} cy={77 + at.y} rx={6} ry={tall} fill={INK} />
      <Circle cx={48 + at.x} cy={73 + at.y} r={2} fill="#FFFFFF" />
      {mood === 'wink' ? (
        <Path d="M67 78 Q74 72 81 78" {...line} />
      ) : (
        <>
          <Ellipse cx={74 + at.x} cy={77 + at.y} rx={6} ry={tall} fill={INK} />
          <Circle cx={76 + at.x} cy={73 + at.y} r={2} fill="#FFFFFF" />
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

const styles = StyleSheet.create({
  fill: { flex: 1 },
  z: { position: 'absolute', fontFamily: font.display, color: '#FFFFFF' },
});
