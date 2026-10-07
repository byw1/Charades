import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { makeSessionId } from '@/game/ids';
import { ROUND_SECONDS_PRESETS, type WinCondition } from '@/game/types';
import { useDatabase } from '@/hooks/useDatabase';
import { useNewGameStore } from '@/hooks/useNewGameStore';
import { useSessionStore } from '@/hooks/useSessionStore';
import { useSettings } from '@/hooks/useSettings';
import { getDeck } from '@/storage/deckRepo';
import { discardOtherUnfinishedSessions, saveSession } from '@/storage/sessionRepo';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Footer, Screen } from '@/ui/Screen';
import { SectionLabel } from '@/ui/Section';
import { StepHeader } from '@/ui/StepHeader';
import { space } from '@/ui/tokens';

const WIN_CONDITIONS: { label: string; emoji: string; value: WinCondition; help: string }[] = [
  { label: 'Rounds', emoji: '🔁', value: { kind: 'rounds', count: 4 }, help: 'Same turns each' },
  { label: 'Score', emoji: '🎯', value: { kind: 'score', target: 20 }, help: 'First to a target' },
  { label: 'Deck out', emoji: '🃏', value: { kind: 'deckExhausted' }, help: 'Until cards run out' },
];

const ROUND_COUNTS = [2, 3, 4, 6, 8];
const SCORE_TARGETS = [10, 15, 20, 30];

/** Step three of three: how the game is played and how it ends. */
export default function NewGameSettingsScreen() {
  const router = useRouter();
  const database = useDatabase();

  const deckIds = useNewGameStore((s) => s.deckIds);
  const settings = useNewGameStore((s) => s.settings);
  const setRoundSeconds = useNewGameStore((s) => s.setRoundSeconds);
  const setPassPenalty = useNewGameStore((s) => s.setPassPenalty);
  const setWinCondition = useNewGameStore((s) => s.setWinCondition);
  const resolvedTeams = useNewGameStore((s) => s.resolvedTeams);
  const resetDraft = useNewGameStore((s) => s.reset);

  const startSession = useSessionStore((s) => s.startSession);
  const appSettings = useSettings();
  const [starting, setStarting] = useState(false);

  const start = async () => {
    if (database.status !== 'ready' || starting) return;
    setStarting(true);

    try {
      const loaded = await Promise.all(deckIds.map((id) => getDeck(database.db, id)));
      const decks = loaded.flatMap((deck) =>
        deck ? [{ id: deck.id, name: deck.name, accentColor: deck.accentColor, cards: deck.cards }] : [],
      );

      const session = startSession({
        id: makeSessionId(),
        decks,
        teams: resolvedTeams(),
        // Input mode is a preference about the person holding the phone, not
        // about this game, so it is set once in app settings. Stamped in here
        // so the stored session records what it was actually played with.
        settings: { ...settings, inputMode: appSettings.inputMode },
        now: new Date().toISOString(),
        seed: Date.now() >>> 0,
      });

      // Written before the first round so a crash during play still leaves
      // something to resume, and any earlier half-played game is abandoned now
      // rather than lingering to be offered later.
      await saveSession(database.db, session);
      await discardOtherUnfinishedSessions(database.db, session.id);

      resetDraft();
      router.dismissAll();
      router.replace('/round/intro');
    } finally {
      setStarting(false);
    }
  };

  return (
    <Screen>
      <StepHeader
        step={3}
        of={3}
        title="Last thing: how do we play?"
        subtitle="The defaults are great if you just want to go."
        onClose={() => router.dismissAll()}
        mood="excited"
      />

      <ScrollView contentContainerStyle={styles.body}>
        <View>
          <SectionLabel>Round length</SectionLabel>
          <View style={styles.row}>
            {ROUND_SECONDS_PRESETS.map((preset) => (
              <Chip
                key={preset}
                grow
                label={`${preset}s`}
                selected={settings.roundSeconds === preset}
                onPress={() => setRoundSeconds(preset)}
                accessibilityLabel={`${preset} second rounds`}
              />
            ))}
          </View>
        </View>

        <View>
          <SectionLabel>Game ends on</SectionLabel>
          <View style={styles.row}>
            {WIN_CONDITIONS.map((option) => (
              <Chip
                key={option.label}
                grow
                emoji={option.emoji}
                label={option.label}
                detail={option.help}
                selected={settings.winCondition.kind === option.value.kind}
                onPress={() => setWinCondition(option.value)}
              />
            ))}
          </View>

          {settings.winCondition.kind === 'rounds' ? (
            <View style={[styles.row, styles.sub]}>
              {ROUND_COUNTS.map((count) => (
                <Chip
                  key={count}
                  grow
                  label={String(count)}
                  selected={settings.winCondition.kind === 'rounds' && settings.winCondition.count === count}
                  onPress={() => setWinCondition({ kind: 'rounds', count })}
                  accessibilityLabel={`${count} rounds each`}
                />
              ))}
            </View>
          ) : null}

          {settings.winCondition.kind === 'score' ? (
            <View style={[styles.row, styles.sub]}>
              {SCORE_TARGETS.map((target) => (
                <Chip
                  key={target}
                  grow
                  label={String(target)}
                  selected={settings.winCondition.kind === 'score' && settings.winCondition.target === target}
                  onPress={() => setWinCondition({ kind: 'score', target })}
                  accessibilityLabel={`First to ${target} points`}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View>
          <SectionLabel>Passing</SectionLabel>
          <View style={styles.row}>
            <Chip
              grow
              emoji="😌"
              label="Free"
              detail="Pass all you like"
              selected={settings.passPenalty === 0}
              onPress={() => setPassPenalty(0)}
              accessibilityLabel="Passes cost nothing"
            />
            <Chip
              grow
              emoji="😬"
              label="Costs a point"
              detail="Think before you skip"
              selected={settings.passPenalty === 1}
              onPress={() => setPassPenalty(1)}
            />
          </View>
        </View>
      </ScrollView>

      <Footer>
        <Button
          label={starting ? 'Starting' : 'Start game'}
          variant="primary"
          size="lg"
          icon="play"
          disabled={starting || database.status !== 'ready'}
          onPress={() => void start()}
        />
      </Footer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: space.xs, paddingBottom: space.xl, gap: space.lg },
  row: { flexDirection: 'row', gap: space.sm + 2, paddingHorizontal: 20, flexWrap: 'wrap' },
  sub: { paddingTop: space.sm + 4 },
});
