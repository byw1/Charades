import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { elapsedMs, remainingMs } from '@/game/round';
import { swipeOutcome } from '@/game/swipe';
import { phaseInfo } from '@/game/threeRounds';
import { twistById } from '@/game/twists';
import type { Outcome } from '@/game/types';
import { WARNING_SECONDS } from '@/game/types';
import { useHaptics } from '@/hooks/useHaptics';
import { useRoundScreenMode } from '@/hooks/useRoundScreenMode';
import { useSessionStore } from '@/hooks/useSessionStore';
import { useSettings } from '@/hooks/useSettings';
import { useSounds } from '@/hooks/useSounds';
import { useTilt } from '@/hooks/useTilt';
import { useVoiceReferee } from '@/hooks/useVoiceReferee';
import { VOICE_REFEREE_LAUNCHED, voiceSupported } from '@/media/voice';
import { Button } from '@/ui/Button';
import { CardFace } from '@/ui/CardFace';
import { CircleButton } from '@/ui/CircleButton';
import { cardTextOn } from '@/ui/contrast';
import { FlashOverlay } from '@/ui/FlashOverlay';
import { Icon } from '@/ui/Icon';
import { useLayout } from '@/ui/layout';
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
  const sound = useSounds();

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
  const endRound = useSessionStore((s) => s.endRound);
  const resetSession = useSessionStore((s) => s.reset);
  // The round plays whichever way the phone is held; only the full-screen
  // moments (paused, time's up) need to know which way that is.
  const { landscape } = useLayout();
  const upright = !landscape;
  // Upright, the room's pills drop below the Dynamic Island.
  const insets = useSafeAreaInsets();
  const pillTop = upright ? { top: insets.top + 16 } : null;

  const [now, setNow] = useState(() => Date.now());
  // Each flash gets its own id, so a quick second answer is not cut short by
  // the first flash's timer clearing it.
  const [flash, setFlash] = useState<{ outcome: Outcome; id: number; busted?: string } | null>(null);
  const flashId = useRef(0);
  const warned = useRef(false);
  const endSignalled = useRef(false);
  /** Paused with the pause button, rather than by the app going away. */
  const pausedByHand = useRef(false);
  /** Ended from the pause screen: straight to the recap, no buzzer. */
  const endedByHand = useRef(false);

  useRoundScreenMode({ boostBrightness: settings.boostBrightness });

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
      if (next === 'active') {
        // A pause someone chose stays paused; only the app's own pause lifts.
        if (!pausedByHand.current) resumeRound(Date.now());
      } else pauseRound(Date.now());
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
    if (endedByHand.current) {
      router.replace('/round/recap');
      return;
    }
    haptics.timeUp();
    sound('timeup');

    // Long enough to read "Time's up" before the recap replaces the screen.
    const id = setTimeout(() => router.replace('/round/recap'), 1_400);
    return () => clearTimeout(id);
  }, [haptics, router, sound, state.phase]);

  const onResolve = useCallback(
    (outcome: Outcome, busted?: string) => {
      if (state.phase !== 'running') return;

      if (outcome === 'correct') haptics.correct();
      else if (busted) haptics.timeUp();
      else haptics.pass();
      sound(outcome === 'correct' ? 'correct' : busted ? 'busted' : 'pass');

      resolve(outcome, Date.now(), busted ? { busted } : undefined);

      flashId.current += 1;
      const id = flashId.current;
      setFlash(busted ? { outcome, id, busted } : { outcome, id });
      // A bust stays up a little longer: the room needs to see who said what.
      setTimeout(() => setFlash((current) => (current?.id === id ? null : current)), busted ? flashMs * 2 : flashMs);
    },
    [haptics, resolve, sound, state.phase],
  );

  /**
   * The voice referee, when it is on and this phone can listen offline. It
   * answers alongside tap or tilt rather than instead of them, so a missed
   * word can still be scored by hand.
   */
  const [canListen] = useState(() => VOICE_REFEREE_LAUNCHED && settings.voiceReferee && voiceSupported());
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
  const swiping = settings.inputMode === 'swipe';

  const pause = () => {
    pausedByHand.current = true;
    haptics.select();
    pauseRound(Date.now());
  };

  const carryOn = () => {
    pausedByHand.current = false;
    resumeRound(Date.now());
  };

  const endNow = () => {
    endedByHand.current = true;
    endRound(Date.now());
  };

  const quit = () => {
    // The game is saved after every round; this one is dropped and taken
    // again from the top on resume.
    resetSession();
    router.dismissAll();
    router.replace('/');
  };

  if (state.phase === 'paused') {
    return (
      <Pressable
        style={[styles.paused, upright && styles.stacked]}
        onPress={carryOn}
        accessibilityRole="button"
        accessibilityLabel={`Paused. ${Math.ceil(left / 1000)} seconds left. Tap to carry on.`}
      >
        <Mascot size={upright ? 130 : 110} mood="sleepy" />
        <View style={[styles.pausedCopy, upright && styles.centred]}>
          <Text style={[styles.pausedTitle, upright && styles.pausedTitleUpright]} allowFontScaling={false}>
            Paused
          </Text>
          <Text style={[styles.pausedBody, upright && styles.textCentred]}>
            {Math.ceil(left / 1000)} seconds left. Tap anywhere to carry on.
          </Text>
          <View style={[styles.pausedActions, upright && styles.pausedActionsUpright]}>
            <Button label="End round" icon="flag" size="sm" onPress={endNow} />
            <Button label="Quit game" icon="home" size="sm" onPress={quit} accessibilityHint="Saved rounds are kept" />
          </View>
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
        <TimerBar fraction={fraction} warning={warning} top={upright ? insets.top + 2 : undefined} />
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

      {/* For the room: a way to stop the clock. Small and in the corner, so a
          hand holding the phone doesn't hit it. */}
      {state.phase === 'running' ? (
        <View style={[styles.pauseSpot, upright ? { top: insets.top + 8 } : null]}>
          <CircleButton icon="pause" label="Pause" tone="scrim" size={40} onPress={pause} />
        </View>
      ) : null}

      {/* For the room, not the holder: how the round is going. */}
      <View style={[styles.tally, pillTop]} pointerEvents="none" accessible={false}>
        <Icon name="check" size={18} color={onAccent} weight={3.5} />
        <Text style={[styles.tallyText, { color: onAccent }]} allowFontScaling={false}>
          {got}
        </Text>
      </View>

      {/* The rule in force, for the room: a chaos twist or the hat's phase. */}
      {badge ? (
        <View style={[styles.badge, pillTop]} pointerEvents="none" accessible={false}>
          <Text style={[styles.badgeText, { color: onAccent }]} allowFontScaling={false} numberOfLines={1}>
            {badge}
          </Text>
        </View>
      ) : null}

      {/* Swipe anywhere: up for got it, down to pass. */}
      {swiping ? <SwipeLayer onSwipe={onResolve} /> : null}

      {/* Half the screen each. The holder is aiming by position, not by sight. */}
      {tilting || swiping ? null : (
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
        <View style={[styles.timeUp, upright && styles.stacked]} pointerEvents="none">
          <PopIn>
            <Mascot size={150} mood="wow" />
          </PopIn>
          <PopIn delay={80}>
            <Text style={[styles.timeUpText, upright && styles.timeUpTextUpright]} allowFontScaling={false}>
              {state.cleared ? 'Hat’s empty!' : 'Time’s up!'}
            </Text>
          </PopIn>
        </View>
      ) : null}
    </View>
  );
}

/**
 * A full-screen layer that turns a vertical swipe into an answer. The rule for
 * what counts lives in /src/game/swipe, where it is tested.
 */
function SwipeLayer({ onSwipe }: { onSwipe: (outcome: Outcome) => void }) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  return (
    <View
      style={styles.hitAreas}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(event) => {
        const { pageX, pageY, timestamp } = event.nativeEvent;
        start.current = { x: pageX, y: pageY, t: timestamp };
      }}
      onResponderRelease={(event) => {
        const from = start.current;
        start.current = null;
        if (!from) return;
        const { pageX, pageY, timestamp } = event.nativeEvent;
        const dy = pageY - from.y;
        const outcome = swipeOutcome(pageX - from.x, dy, dy / Math.max(1, timestamp - from.t));
        if (outcome) onSwipe(outcome);
      }}
      accessible
      accessibilityLabel="Swipe up for got it, down to pass"
      accessibilityActions={[
        { name: 'increment', label: 'Got it' },
        { name: 'decrement', label: 'Pass' },
      ]}
      onAccessibilityAction={(event) => onSwipe(event.nativeEvent.actionName === 'increment' ? 'correct' : 'pass')}
    />
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
  pausedActions: { flexDirection: 'row', gap: space.sm, paddingTop: space.md },
  pausedActionsUpright: { justifyContent: 'center' },
  pauseSpot: { position: 'absolute', top: 6, left: 6, zIndex: 10 },
  stacked: { flexDirection: 'column' },
  centred: { alignItems: 'center' },
  textCentred: { textAlign: 'center' },
  pausedTitleUpright: { fontSize: 52, lineHeight: 56, textAlign: 'center' },
  timeUpTextUpright: { fontSize: 64, lineHeight: 68, textAlign: 'center' },
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
