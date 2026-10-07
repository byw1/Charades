import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { elapsedMs, remainingMs } from '@/game/round';
import { phaseInfo } from '@/game/threeRounds';
import { twistById } from '@/game/twists';
import type { Outcome } from '@/game/types';
import { WARNING_SECONDS } from '@/game/types';
import { useHaptics } from '@/hooks/useHaptics';
import { useRoundScreenMode } from '@/hooks/useRoundScreenMode';
import { useSessionStore } from '@/hooks/useSessionStore';
import { useSettings } from '@/hooks/useSettings';
import { useTilt } from '@/hooks/useTilt';
import { useVoiceReferee } from '@/hooks/useVoiceReferee';
import { voiceSupported } from '@/media/voice';
import { CardFace } from '@/ui/CardFace';
import { cardTextOn } from '@/ui/contrast';
import { FlashOverlay } from '@/ui/FlashOverlay';
import { Icon } from '@/ui/Icon';
import { Mascot } from '@/ui/Mascot';
import { PopIn } from '@/ui/motion';
import { RoundCamera } from '@/ui/RoundCamera';
import { TimerBar } from '@/ui/TimerBar';
import { color, flashMs, font, radius, space } from '@/ui/tokens';

const TICK_MS = 100;

/**
 * The round.
 *
 * Top half of the screen is correct, bottom half is pass. The holder cannot see
 * the screen, so the targets are half the display each and positionally
 * obvious — no small buttons anywhere.
 */
export default function RoundPlayScreen() {
  const router = useRouter();
  const settings = useSettings();
  const haptics = useHaptics();

  const state = useSessionStore((s) => s.roundState);
  const mode = useSessionStore((s) => s.session?.settings.mode ?? 'classic');
  const openRound = useSessionStore((s) => s.session?.rounds.find((round) => round.endedAt === null));
  const hatLeft = useSessionStore((s) => s.roundPool.length);
  const sessionId = useSessionStore((s) => s.session?.id);
  const begin = useSessionStore((s) => s.start);
  const resolve = useSessionStore((s) => s.resolve);
  const pauseRound = useSessionStore((s) => s.pauseRound);
  const resumeRound = useSessionStore((s) => s.resumeRound);
  const tick = useSessionStore((s) => s.tick);

  const [now, setNow] = useState(() => Date.now());
  // Each flash gets its own id, so a quick second answer is not cut short by
  // the first flash's timer clearing it.
  const [flash, setFlash] = useState<{ outcome: Outcome; id: number; busted?: string } | null>(null);
  const flashId = useRef(0);
  const warned = useRef(false);
  const endSignalled = useRef(false);

  useRoundScreenMode({ landscape: true, boostBrightness: settings.boostBrightness });

  // Start on mount. The intro screen owns the countdown, so by the time this
  // renders the phone is already on a forehead.
  useEffect(() => {
    if (state.phase === 'intro') begin(Date.now());
  }, [begin, state.phase]);

  useEffect(() => {
    const id = setInterval(() => {
      const at = Date.now();
      setNow(at);
      tick(at);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [tick]);

  /**
   * An incoming call backgrounds the app. The timer pauses rather than running
   * down while nobody can see the screen, and the round resumes on return.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') resumeRound(Date.now());
      else pauseRound(Date.now());
    });
    return () => subscription.remove();
  }, [pauseRound, resumeRound]);

  const left = remainingMs(state, now);

  useEffect(() => {
    if (state.phase !== 'running') return;
    if (warned.current) return;
    if (left <= WARNING_SECONDS * 1_000) {
      warned.current = true;
      haptics.warning();
    }
  }, [haptics, left, state.phase]);

  useEffect(() => {
    if (state.phase !== 'ended' || endSignalled.current) return;
    endSignalled.current = true;
    haptics.timeUp();

    // Long enough to read "Time's up" before the recap replaces the screen.
    const id = setTimeout(() => router.replace('/round/recap'), 1_400);
    return () => clearTimeout(id);
  }, [haptics, router, state.phase]);

  const onResolve = useCallback(
    (outcome: Outcome, busted?: string) => {
      if (state.phase !== 'running') return;

      if (outcome === 'correct') haptics.correct();
      else if (busted) haptics.timeUp();
      else haptics.pass();

      resolve(outcome, Date.now(), busted ? { busted } : undefined);

      flashId.current += 1;
      const id = flashId.current;
      setFlash(busted ? { outcome, id, busted } : { outcome, id });
      // A bust stays up a little longer: the room needs to see who said what.
      setTimeout(() => setFlash((current) => (current?.id === id ? null : current)), busted ? flashMs * 2 : flashMs);
    },
    [haptics, resolve, state.phase],
  );

  /**
   * The voice referee, when it is on and this phone can listen offline. It
   * answers alongside tap or tilt rather than instead of them, so a missed
   * word can still be scored by hand.
   */
  const [canListen] = useState(() => settings.voiceReferee && voiceSupported());
  useVoiceReferee({
    enabled: canListen && state.phase === 'running',
    card: state.card,
    mode,
    onCorrect: () => onResolve('correct'),
    onBusted: (word) => onResolve('pass', word),
  });

  /**
   * Tilt replaces tap rather than joining it. The phone is pressed against skin
   * for the whole round, so leaving full-screen tap targets live underneath a
   * tilt game is a stray palm away from resolving a card nobody guessed.
   *
   * A device with no accelerometer, or one whose sensor stays silent, keeps
   * tap, so tilt being the default can never leave a round with no way to
   * answer.
   */
  const tiltChosen = settings.inputMode === 'tilt';
  const { available: tiltAvailable } = useTilt({
    enabled: tiltChosen && state.phase === 'running',
    onGesture: onResolve,
  });
  const tilting = tiltChosen && tiltAvailable;

  if (state.phase === 'paused') {
    return (
      <Pressable
        style={styles.paused}
        onPress={() => resumeRound(Date.now())}
        accessibilityRole="button"
        accessibilityLabel={`Paused. ${Math.ceil(left / 1000)} seconds left. Tap to carry on.`}
      >
        <Mascot size={150} mood="sleepy" />
        <View style={styles.pausedCopy}>
          <Text style={styles.pausedTitle} allowFontScaling={false}>
            Paused 😴
          </Text>
          <Text style={styles.pausedBody}>
            {Math.ceil(left / 1000)} seconds left. Tap anywhere to carry on.
          </Text>
        </View>
      </Pressable>
    );
  }

  const card = state.card;
  const accent = card?.accentColor ?? color.brand;
  const fraction = state.durationMs === 0 ? 0 : left / state.durationMs;
  const warning = left <= WARNING_SECONDS * 1_000;
  const got = state.results.filter((result) => result.outcome === 'correct').length;
  const onAccent = cardTextOn(accent);
  const twist = twistById(openRound?.twist);
  const phase = openRound?.phase ? phaseInfo(openRound.phase) : null;
  const rule = phase
    ? `${phase.emoji} ${phase.title} · ${Math.max(0, hatLeft - got)} left`
    : twist
      ? `${twist.emoji} ${twist.title}`
      : null;
  // A microphone in use should never be a secret.
  const badge = canListen ? [rule, '🎙️ Listening'].filter(Boolean).join(' · ') : rule;

  return (
    <View style={styles.screen}>
      <View style={[styles.card, { backgroundColor: accent }]}>
        <TimerBar fraction={fraction} warning={warning} />
        {card ? (
          <CardFace
            text={card.text}
            accentColor={accent}
            note={card.note}
            image={card.image}
            taboo={mode === 'taboo' ? card.taboo : undefined}
          />
        ) : (
          <View style={styles.blank} />
        )}
      </View>

      {/* For the room, not the holder: how the round is going. */}
      <View style={styles.tally} pointerEvents="none" accessible={false}>
        <Icon name="check" size={18} color={onAccent} weight={3.5} />
        <Text style={[styles.tallyText, { color: onAccent }]} allowFontScaling={false}>
          {got}
        </Text>
      </View>

      {/* The rule in force, for the room: a chaos twist or the hat's phase. */}
      {badge ? (
        <View style={styles.badge} pointerEvents="none" accessible={false}>
          <Text style={[styles.badgeText, { color: onAccent }]} allowFontScaling={false} numberOfLines={1}>
            {badge}
          </Text>
        </View>
      ) : null}

      {/* Half the screen each. The holder is aiming by position, not by sight. */}
      {tilting ? null : (
        <View style={styles.hitAreas} pointerEvents="box-none">
          <Pressable
            style={styles.hitArea}
            onPress={() => onResolve('correct')}
            accessibilityRole="button"
            accessibilityLabel="Got it"
          />
          <Pressable
            style={styles.hitArea}
            onPress={() => onResolve('pass')}
            accessibilityRole="button"
            accessibilityLabel="Pass"
          />
        </View>
      )}

      {settings.recordRounds && sessionId && openRound ? (
        <RoundCamera
          active={state.phase === 'running'}
          sessionId={sessionId}
          roundId={openRound.id}
          roundTimeNow={() => elapsedMs(useSessionStore.getState().roundState, Date.now())}
          // The voice referee needs the microphone; the video goes silent.
          mute={canListen}
        />
      ) : null}

      {flash ? <FlashOverlay key={flash.id} outcome={flash.outcome} busted={flash.busted} /> : null}

      {state.phase === 'ended' ? (
        <View style={styles.timeUp} pointerEvents="none">
          <PopIn>
            <Mascot size={150} mood="wow" />
          </PopIn>
          <PopIn delay={80}>
            <Text style={styles.timeUpText} allowFontScaling={false}>
              {state.cleared ? 'Hat’s empty!' : 'Time’s up!'}
            </Text>
          </PopIn>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.ink,
  },
  card: {
    ...StyleSheet.absoluteFill,
  },
  blank: {
    flex: 1,
  },
  tally: {
    position: 'absolute',
    top: 30,
    right: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm + 4,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  badge: {
    position: 'absolute',
    top: 30,
    left: 52,
    maxWidth: '55%',
    paddingHorizontal: space.sm + 4,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  badgeText: {
    fontFamily: font.heavy,
    fontSize: 15,
    lineHeight: 22,
  },
  tallyText: {
    fontFamily: font.display,
    fontSize: 18,
    lineHeight: 22,
  },
  hitAreas: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'column',
  },
  hitArea: {
    flex: 1,
  },
  paused: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.background,
    gap: space.xl,
    paddingHorizontal: space.xl,
  },
  pausedCopy: { gap: space.xs, flexShrink: 1 },
  pausedTitle: {
    fontFamily: font.display,
    fontSize: 64,
    lineHeight: 68,
    letterSpacing: -2,
    color: color.bone,
  },
  pausedBody: {
    fontFamily: font.bold,
    fontSize: 19,
    lineHeight: 26,
    color: color.bone,
    opacity: 0.9,
  },
  timeUp: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    backgroundColor: color.brand,
    zIndex: 20,
  },
  timeUpText: {
    fontFamily: font.display,
    fontSize: 104,
    lineHeight: 108,
    letterSpacing: -3,
    color: color.ink,
  },
});
