import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { makeRoundId } from '@/game/ids';
import { whoseTurn } from '@/game/session';
import { phaseInfo } from '@/game/threeRounds';
import { twistById } from '@/game/twists';
import type { Session } from '@/game/types';
import { useHaptics } from '@/hooks/useHaptics';
import { useRoundScreenMode } from '@/hooks/useRoundScreenMode';
import { useSessionStore } from '@/hooks/useSessionStore';
import { useSettings } from '@/hooks/useSettings';
import { cardTextOn } from '@/ui/contrast';
import { useLayout } from '@/ui/layout';
import { Mascot } from '@/ui/Mascot';
import { PopIn } from '@/ui/motion';
import { color, font, palette, space } from '@/ui/tokens';

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
  // Upright, everything stacks; sideways it reads left to right.
  const { landscape } = useLayout();
  const upright = !landscape;
  const [ready, setReady] = useState(false);

  useRoundScreenMode();

  // Opens the round for whoever is up. Not persisted until the round
  // completes, so quitting here leaves the session where it was.
  useEffect(() => {
    beginRound(makeRoundId(), new Date().toISOString());
  }, [beginRound]);

  const opened = session?.rounds.some((round) => round.endedAt === null) ?? false;
  const notice = session ? announcement(session) : null;
  // A twist or a new phase is read out before the phone goes up, so the
  // countdown waits for a tap rather than racing the room through the rule.
  const counting = opened && (!notice || ready);

  useEffect(() => {
    if (!counting) return;
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
  }, [counting, haptics, router]);

  const turn = session ? whoseTurn(session) : null;
  const teams = session?.teams.length ?? 0;
  const background = teams > 1 && turn ? turn.team.color : palette.purple;
  const ink = cardTextOn(background);
  const teamLabel = teams > 1 ? turn?.team.name : null;
  const who = turn?.playerName ? `${turn.playerName}, you’re up` : 'Phone on your forehead';

  if (notice && !ready) {
    return (
      <Pressable
        style={[styles.screen, { backgroundColor: color.ink }]}
        onPress={() => {
          haptics.select();
          setReady(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${notice.overline}. ${notice.title}. ${notice.rule}. Tap when ready.`}
      >
        <SafeAreaView style={[styles.safe, upright && styles.safeUpright]}>
          <PopIn style={styles.noticeSticker}>
            <Text style={styles.noticeEmoji} allowFontScaling={false}>
              {notice.emoji}
            </Text>
          </PopIn>
          <View style={[styles.copy, upright && styles.copyUpright]}>
            <View style={[styles.teamPill, { backgroundColor: notice.tint }]}>
              <Text style={[styles.team, { color: color.ink }]} allowFontScaling={false}>
                {notice.overline}
              </Text>
            </View>
            <Text style={[styles.who, { color: color.bone }, upright && styles.centred]} allowFontScaling={false} numberOfLines={2}>
              {notice.title}
            </Text>
            <Text style={[styles.rule, { color: color.bone }, upright && styles.centred]}>{notice.rule}</Text>
            <Text style={[styles.hint, { color: notice.tint }, upright && styles.centred]}>Tap when you’re ready</Text>
          </View>
        </SafeAreaView>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.screen, { backgroundColor: background }]}
      // Skipping is deliberate rather than accidental: some groups are ready
      // before the app is, and waiting out three seconds every round grates.
      onPress={() => router.replace('/round/play')}
      accessibilityRole="button"
      accessibilityLabel={`${who}. Starting in ${count}. Tap to start now.`}
    >
      <View style={[styles.blob, { backgroundColor: ink === color.bone ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} />
      <SafeAreaView style={[styles.safe, upright && styles.safeUpright]}>
        <PopIn style={styles.sticker}>
          <Mascot size={150} mood="excited" />
        </PopIn>

        <View style={[styles.copy, upright && styles.copyUpright]}>
          {teamLabel ? (
            <View style={[styles.teamPill, { backgroundColor: ink }]}>
              <Text style={[styles.team, { color: background }]} allowFontScaling={false}>
                {teamLabel}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.who, { color: ink }, upright && styles.centred]} allowFontScaling={false} numberOfLines={2}>
            {who}
          </Text>
          <Text style={[styles.hint, { color: ink }, upright && styles.centred]}>
            {settings.inputMode === 'tilt'
              ? 'Tip down if you got it, up to pass'
              : settings.inputMode === 'swipe'
                ? 'Swipe up if you got it, down to pass'
                : 'Tap the top if you got it, the bottom to pass'}
          </Text>
        </View>

        <View style={[styles.ring, { borderColor: ink }]}>
          {count > 0 ? (
            <PopIn key={count}>
              <Text style={[styles.count, { color: ink }]} allowFontScaling={false}>
                {count}
              </Text>
            </PopIn>
          ) : null}
        </View>
      </SafeAreaView>
    </Pressable>
  );
}

type Notice = { emoji: string; overline: string; title: string; rule: string; tint: string };

/**
 * What the room needs to hear before this round, if anything: a new phase in
 * three-round mode, a chaos twist, or the banned-words rule on the first round.
 */
function announcement(session: Session): Notice | null {
  const open = session.rounds.find((round) => round.endedAt === null);
  if (!open) return null;

  if (open.phase) {
    const firstOfPhase = !session.rounds.some((round) => round.endedAt !== null && round.phase === open.phase);
    if (!firstOfPhase) return null;
    const info = phaseInfo(open.phase);
    return { emoji: info.emoji, overline: `PHASE ${info.phase} OF 3`, title: info.title, rule: info.rule, tint: palette.yellow };
  }

  const twist = twistById(open.twist);
  if (twist) {
    return { emoji: twist.emoji, overline: '🌀 CHAOS ROUND', title: twist.title, rule: twist.rule, tint: palette.pink };
  }

  const first = session.rounds.length === 1;
  if (first && session.settings.mode === 'taboo') {
    return {
      emoji: '🚫',
      overline: 'BANNED WORDS',
      title: 'Don’t say the words',
      rule: 'The room can’t say anything listed under the card. Slip up and it’s busted: the card’s gone and it costs a point.',
      tint: palette.red,
    };
  }

  return null;
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' },
  blob: { position: 'absolute', width: 520, height: 520, borderRadius: 260, top: -260, right: -120 },
  safe: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    paddingHorizontal: space.xl,
  },
  safeUpright: { flexDirection: 'column', gap: space.xl },
  copyUpright: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', alignItems: 'center' },
  centred: { textAlign: 'center' },
  sticker: { transform: [{ rotate: '-8deg' }] },
  copy: { flex: 1, gap: space.sm, alignItems: 'flex-start' },
  teamPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  team: { fontFamily: font.heavy, fontSize: 15, lineHeight: 20 },
  who: { fontFamily: font.display, fontSize: 46, lineHeight: 48, letterSpacing: -1.5 },
  hint: { fontFamily: font.bold, fontSize: 16, lineHeight: 22, opacity: 0.85 },
  ring: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { fontFamily: font.display, fontSize: 84, lineHeight: 96 },
  noticeSticker: { transform: [{ rotate: '-8deg' }], width: 150, alignItems: 'center' },
  noticeEmoji: { fontSize: 110, lineHeight: 130 },
  rule: { fontFamily: font.bold, fontSize: 19, lineHeight: 26, opacity: 0.92 },
});
