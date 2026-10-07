import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { makeRoundId } from '@/game/ids';
import { whoseTurn } from '@/game/session';
import { useHaptics } from '@/hooks/useHaptics';
import { useRoundScreenMode } from '@/hooks/useRoundScreenMode';
import { useSessionStore } from '@/hooks/useSessionStore';
import { useSettings } from '@/hooks/useSettings';
import { cardTextOn } from '@/ui/contrast';
import { Mascot } from '@/ui/Mascot';
import { PopIn } from '@/ui/motion';
import { color, font, space } from '@/ui/tokens';

const COUNT_FROM = 3;
const TICK_MS = 800;

/**
 * Who is up, then 3-2-1.
 *
 * The countdown is the moment the phone goes to the forehead, so it is large
 * enough to read while it is moving and each beat is a haptic — the holder will
 * not be looking at the screen by the time it hits one. The screen takes the
 * team's colour so the room knows whose turn it is at a glance.
 */
export default function RoundIntroScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  const session = useSessionStore((s) => s.session);
  const beginRound = useSessionStore((s) => s.beginRound);
  const settings = useSettings();

  const [count, setCount] = useState(COUNT_FROM);

  useRoundScreenMode({ landscape: true });

  // Opens the round for whoever is up. Not persisted until the round
  // completes, so quitting here leaves the session where it was.
  useEffect(() => {
    beginRound(makeRoundId(), new Date().toISOString());
  }, [beginRound]);

  useEffect(() => {
    haptics.countdownTick();

    const id = setInterval(() => {
      setCount((current) => {
        if (current <= 1) {
          clearInterval(id);
          router.replace('/round/play');
          return 0;
        }
        haptics.countdownTick();
        return current - 1;
      });
    }, TICK_MS);

    return () => clearInterval(id);
  }, [haptics, router]);

  const turn = session ? whoseTurn(session) : null;
  const teams = session?.teams.length ?? 0;
  const background = teams > 1 && turn ? turn.team.color : color.brand;
  const ink = cardTextOn(background);
  // On a pale team colour the number would vanish into its white bubble.
  const countColor = ink === color.bone ? background : color.ink;
  const teamLabel = teams > 1 ? turn?.team.name : null;
  const who = turn?.playerName ? `${turn.playerName}, you’re up!` : 'Phone on your forehead!';

  return (
    <Pressable
      style={[styles.screen, { backgroundColor: background }]}
      // Skipping is deliberate rather than accidental: some groups are ready
      // before the app is, and waiting out three seconds every round grates.
      onPress={() => router.replace('/round/play')}
      accessibilityRole="button"
      accessibilityLabel={`${who} Starting in ${count}. Tap to start now.`}
    >
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <PopIn>
          <Mascot size={170} mood="excited" />
        </PopIn>

        <View style={styles.copy}>
          {teamLabel ? (
            <Text style={[styles.team, { color: ink }]} allowFontScaling={false}>
              {teamLabel.toUpperCase()}
            </Text>
          ) : null}
          <Text style={[styles.who, { color: ink }]} allowFontScaling={false} numberOfLines={2}>
            {who}
          </Text>
          <Text style={[styles.hint, { color: ink }]}>
            {settings.inputMode === 'tilt'
              ? 'Tilt down for got it, up for pass'
              : 'Tap the top for got it, the bottom to pass'}
          </Text>
        </View>

        <View style={styles.countWrap}>
          {count > 0 ? (
            <PopIn key={count}>
              <View style={styles.countBubble}>
                <Text style={[styles.count, { color: countColor }]} allowFontScaling={false}>
                  {count}
                </Text>
              </View>
            </PopIn>
          ) : null}
        </View>
      </SafeAreaView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    paddingHorizontal: space.xl,
  },
  copy: { flex: 1, gap: space.xs },
  team: { fontFamily: font.black, fontSize: 18, lineHeight: 22, letterSpacing: 2, opacity: 0.85 },
  who: { fontFamily: font.black, fontSize: 40, lineHeight: 46 },
  hint: { fontFamily: font.bold, fontSize: 17, lineHeight: 22, opacity: 0.85 },
  countWrap: { width: 150, alignItems: 'center' },
  countBubble: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: color.bone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { fontFamily: font.black, fontSize: 96, lineHeight: 110 },
});
