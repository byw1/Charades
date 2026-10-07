import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSettingsStore } from '@/hooks/useSettings';
import { Button } from '@/ui/Button';
import { CircleButton } from '@/ui/CircleButton';
import { Mascot, type MascotMood } from '@/ui/Mascot';
import { StoryBar } from '@/ui/ProgressBar';
import { Caption, Sticker } from '@/ui/Social';
import { Text } from '@/ui/Text';
import { color, font, gutter, palette, space } from '@/ui/tokens';

type Story = {
  background: string;
  caption: string;
  detail: string;
  mood: MascotMood;
  stickers?: { text: string; tint: string; tilt: number; top: string; left?: string; right?: string }[];
};

const STORIES: Story[] = [
  {
    background: palette.purple,
    caption: 'Put the phone on your forehead',
    detail: 'A word pops up. Everyone can see it except you.',
    mood: 'happy',
  },
  {
    background: palette.pink,
    caption: 'Your friends yell clues',
    detail: 'Act it out, hum it, describe it. Just don’t say it.',
    mood: 'wow',
    stickers: [
      { text: 'it barks!!', tint: palette.yellow, tilt: -10, top: '22%', left: '6%' },
      { text: 'FETCH', tint: palette.blue, tilt: 8, top: '30%', right: '6%' },
      { text: 'good boy 🐶', tint: '#FFFFFF', tilt: -4, top: '62%', left: '10%' },
    ],
  },
];

/** The intro stories, then one on controls. */
const STORY_COUNT = STORIES.length + 1;

/** The last story teaches whichever controls the phone is set to. */
const CONTROLS: Record<'tilt' | 'tap', Story> = {
  tilt: {
    background: palette.blue,
    caption: 'Tip it down if you got it',
    detail: 'Tip it up to pass. Most cards before time’s up wins.',
    mood: 'excited',
  },
  tap: {
    background: palette.blue,
    caption: 'Tap top if you got it',
    detail: 'Tap the bottom to pass. Most cards before time’s up wins.',
    mood: 'excited',
  },
};

const STORY_MS = 4500;

/**
 * How to play, as stories.
 *
 * Tap the right side for next, the left side for back, and each one moves on
 * by itself — the format everyone this is for already knows how to work.
 * Shown once on first launch, and any time from the You page. Under reduced
 * motion the stories wait for a tap instead of moving on by themselves.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const setSetting = useSettingsStore((s) => s.set);
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [progress] = useState(() => new Animated.Value(0));
  const inputMode = useSettingsStore((s) => s.inputMode);
  const stories = [...STORIES, CONTROLS[inputMode]];

  const story = stories[index] ?? stories[0]!;
  const last = index === stories.length - 1;

  const finish = () => {
    setSetting('onboarded', true);
    if (replay) router.back();
    else router.replace('/');
  };

  useEffect(() => {
    progress.setValue(0);
    if (reduced || last) {
      if (last) progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) setIndex((current) => Math.min(current + 1, STORY_COUNT - 1));
    });
    return () => animation.stop();
  }, [index, last, progress, reduced]);

  return (
    <View style={[styles.screen, { backgroundColor: story.background }]}>
      {/* Tap zones: left third goes back, the rest goes forward. */}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.zones}>
          <Pressable
            style={styles.back}
            onPress={() => setIndex(Math.max(0, index - 1))}
            accessibilityRole="button"
            accessibilityLabel="Previous"
          />
          <Pressable
            style={styles.next}
            onPress={() => (last ? undefined : setIndex(index + 1))}
            accessibilityRole="button"
            accessibilityLabel="Next"
          />
        </View>
      </View>

      <SafeAreaView style={styles.safe} pointerEvents="box-none">
        <View style={styles.top} pointerEvents="box-none">
          <StoryBar count={stories.length} index={index} progress={progress} />
          <View style={styles.topRow} pointerEvents="box-none">
            <View style={styles.from}>
              <Mascot size={32} animated={false} />
              <Text style={styles.fromName}>Dex</Text>
              <Text style={styles.fromTime}>how to play</Text>
            </View>
            <CircleButton icon="close" label="Skip" tone="scrim" size={36} onPress={finish} />
          </View>
        </View>

        <View style={styles.middle} pointerEvents="none" key={index}>
          {story.stickers?.map((sticker) => (
            <Sticker
              key={sticker.text}
              tint={sticker.tint}
              tilt={sticker.tilt}
              style={{
                position: 'absolute',
                top: sticker.top as `${number}%`,
                left: sticker.left as `${number}%` | undefined,
                right: sticker.right as `${number}%` | undefined,
              }}
            >
              {sticker.text}
            </Sticker>
          ))}
          <Mascot size={230} mood={story.mood} glyph={index === 2 ? '👆' : '?'} />
        </View>

        <View style={styles.bottom} pointerEvents="box-none">
          <Caption size="lg">{story.caption}</Caption>
          <RNText style={styles.detail}>{story.detail}</RNText>
          {last ? (
            <View style={styles.cta}>
              <Button label="Let’s play" variant="white" size="lg" onPress={finish} />
            </View>
          ) : (
            <Text style={styles.tapHint}>Tap to continue</Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  zones: { flex: 1, flexDirection: 'row' },
  back: { flex: 1 },
  next: { flex: 2 },
  safe: { flex: 1 },
  top: { paddingHorizontal: space.sm, paddingTop: space.sm, gap: space.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  from: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  fromName: { fontFamily: font.heavy, fontSize: 15, lineHeight: 20, color: color.bone },
  fromTime: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.75)' },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottom: { gap: space.md, paddingBottom: space.md, alignItems: 'center' },
  detail: {
    fontFamily: font.bold,
    fontSize: 17,
    lineHeight: 23,
    color: color.bone,
    textAlign: 'center',
    paddingHorizontal: gutter * 2,
  },
  cta: { alignSelf: 'stretch', paddingHorizontal: gutter },
  tapHint: { fontFamily: font.bold, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.7)', paddingBottom: space.sm },
});
