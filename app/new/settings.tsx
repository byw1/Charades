import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ROUND_SECONDS_PRESETS, type WinCondition } from '@/game/types';
import { useDatabase } from '@/hooks/useDatabase';
import { useNewGameStore } from '@/hooks/useNewGameStore';
import { useStartGame } from '@/hooks/useStartGame';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Footer, Screen } from '@/ui/Screen';
import { SectionLabel } from '@/ui/Section';
import { StepHeader } from '@/ui/StepHeader';
import { gutter, space } from '@/ui/tokens';

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

  const { start, starting } = useStartGame();

  const go = async () => {
    const started = await start({ deckIds, teams: resolvedTeams(), settings });
    if (started) resetDraft();
  };

  return (
    <Screen>
      <StepHeader
        step={3}
        of={3}
        title="House rules"
        subtitle="Or just hit start. The defaults are good."
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
          onPress={() => void go()}
        />
      </Footer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: space.xs, paddingBottom: space.xl, gap: space.lg },
  row: { flexDirection: 'row', gap: space.sm + 2, paddingHorizontal: gutter, flexWrap: 'wrap' },
  sub: { paddingTop: space.sm + 4 },
});
