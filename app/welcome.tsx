import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSettingsStore } from '@/hooks/useSettings';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Mascot, type MascotMood } from '@/ui/Mascot';
import { PopIn } from '@/ui/motion';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { color, palette, radius, space } from '@/ui/tokens';

type Slide = {
  title: string;
  body: string;
  art: 'forehead' | 'shout' | 'tap';
  mood: MascotMood;
};

const SLIDES: Slide[] = [
  {
    title: 'Phone on your forehead',
    body: 'A word shows on the screen. You can’t see it — but everyone else can.',
    art: 'forehead',
    mood: 'happy',
  },
  {
    title: 'Your friends shout clues',
    body: 'Describe it, act it out, hum it. Anything except saying the word.',
    art: 'shout',
    mood: 'wow',
  },
  {
    title: 'Tap top if you got it',
    body: 'Tap the bottom half to pass. Most cards before the timer runs out wins.',
    art: 'tap',
    mood: 'excited',
  },
];

/**
 * How to play, in three cards.
 *
 * Shown once on first launch, and any time from Home. A party game gets
 * explained out loud to a room, so each card is one sentence someone could
 * read to everyone else.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const setSetting = useSettingsStore((s) => s.set);
  const [index, setIndex] = useState(0);

  const slide = SLIDES[index] ?? SLIDES[0]!;
  const last = index === SLIDES.length - 1;

  const finish = () => {
    setSetting('onboarded', true);
    if (replay) router.back();
    else router.replace('/');
  };

  return (
    <Screen>
      <View style={styles.top}>
        <View style={styles.dots} accessible accessibilityLabel={`Step ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        {last ? null : (
          <Pressable onPress={finish} accessibilityRole="button" hitSlop={space.md}>
            <Text variant="label" tone="faint">
              SKIP
            </Text>
          </Pressable>
        )}
      </View>

      {/* Keyed on the slide so each one springs in fresh. */}
      <View style={styles.body} key={index}>
        <PopIn style={styles.art}>
          <Art kind={slide.art} mood={slide.mood} />
        </PopIn>
        <PopIn from="rise" delay={120} style={styles.copy}>
          <Text variant="display" align="center" accessibilityRole="header">
            {slide.title}
          </Text>
          <Text variant="body" tone="muted" align="center">
            {slide.body}
          </Text>
        </PopIn>
      </View>

      <View style={styles.footer}>
        <Button
          label={last ? 'Let’s play' : 'Continue'}
          variant="primary"
          size="lg"
          onPress={() => (last ? finish() : setIndex(index + 1))}
        />
      </View>
    </Screen>
  );
}

function Art({ kind, mood }: { kind: Slide['art']; mood: MascotMood }) {
  if (kind === 'forehead') {
    return <Mascot size={220} mood={mood} glyph="?" />;
  }

  if (kind === 'shout') {
    return (
      <View style={styles.shout}>
        <View style={[styles.clue, styles.clueLeft]}>
          <Text variant="heading" tone="inverse">
            It barks!
          </Text>
        </View>
        <Mascot size={190} mood={mood} />
        <View style={[styles.clue, styles.clueRight]}>
          <Text variant="heading" tone="inverse">
            Fetch!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.phone}>
      <View style={[styles.half, { backgroundColor: color.correct }]}>
        <Icon name="check" size={34} color={color.bone} weight={4} />
        <Text variant="title" tone="inverse">
          Got it
        </Text>
      </View>
      <View style={[styles.half, { backgroundColor: color.pass }]}>
        <Icon name="pass" size={34} color={color.bone} weight={4} />
        <Text variant="title" tone="inverse">
          Pass
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: space.md,
    minHeight: 48,
  },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.line },
  dotActive: { width: 28, backgroundColor: color.correct },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    gap: space.xl,
  },
  art: { alignItems: 'center', justifyContent: 'center', minHeight: 240 },
  copy: { gap: space.sm },
  footer: { paddingHorizontal: 20, paddingBottom: space.md },
  shout: { width: 300, alignItems: 'center' },
  clue: {
    position: 'absolute',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    zIndex: 2,
  },
  clueLeft: { left: 0, top: 10, backgroundColor: palette.blue, transform: [{ rotate: '-8deg' }] },
  clueRight: { right: 0, top: 60, backgroundColor: palette.pink, transform: [{ rotate: '7deg' }] },
  phone: {
    width: 260,
    height: 230,
    borderRadius: radius.xl,
    borderWidth: 8,
    borderColor: color.ink,
    overflow: 'hidden',
    transform: [{ rotate: '-4deg' }],
  },
  half: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
});
