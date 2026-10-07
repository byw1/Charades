import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { countOutcomes, scoreRound } from '@/game/scoring';
import { whoseTurn } from '@/game/session';
import type { Outcome } from '@/game/types';
import { useDatabase } from '@/hooks/useDatabase';
import { useHaptics } from '@/hooks/useHaptics';
import { useRoundScreenMode } from '@/hooks/useRoundScreenMode';
import { findPoolCard, useSessionStore } from '@/hooks/useSessionStore';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Mascot, type MascotMood } from '@/ui/Mascot';
import { PopIn } from '@/ui/motion';
import { Raised } from '@/ui/Raised';
import { Screen } from '@/ui/Screen';
import { StatTile } from '@/ui/StatTile';
import { Text } from '@/ui/Text';
import { color, palette, radius, space } from '@/ui/tokens';

/**
 * Every card from the round, with the result, tappable to override.
 *
 * Overrides matter because the holder is guessing blind and the group is
 * shouting: a mis-tap is normal, and arguing about it is worse than fixing it.
 * Score is derived from these results, so flipping one here is the whole edit —
 * and nothing is written until Continue, so the edits land in one go.
 */
export default function RoundRecapScreen() {
  const router = useRouter();
  const database = useDatabase();
  const haptics = useHaptics();

  const session = useSessionStore((s) => s.session);
  const results = useSessionStore((s) => s.roundState.results);
  const reshuffled = useSessionStore((s) => s.roundState.reshuffled);
  const pool = useSessionStore((s) => s.pool);
  const overrideResult = useSessionStore((s) => s.overrideResult);
  const commitRound = useSessionStore((s) => s.commitRound);

  const [saving, setSaving] = useState(false);

  // Stays landscape: the phone is still sideways from the round.
  useRoundScreenMode({ landscape: true });

  const { correct, passed } = useMemo(() => countOutcomes(results), [results]);
  const penalty = session?.settings.passPenalty ?? 0;
  const score = useMemo(() => scoreRound(results, penalty), [results, penalty]);

  // The round is still open, so whoseTurn points at whoever just played.
  const turn = session ? whoseTurn(session) : null;
  const showTeam = (session?.teams.length ?? 0) > 1;

  const { headline, mood } = verdict(correct);

  const done = async () => {
    if (database.status !== 'ready' || saving) return;
    setSaving(true);

    try {
      await commitRound(database.db, new Date().toISOString());
      router.replace('/round/standings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.panes}>
        <View style={styles.summary}>
          <View style={styles.hero}>
            <PopIn>
              <Mascot size={92} mood={mood} />
            </PopIn>
            <View style={styles.heroCopy}>
              {showTeam && turn ? (
                <Text variant="overline" style={{ color: turn.team.color }}>
                  {turn.team.name.toUpperCase()}
                  {turn.playerName ? ` · ${turn.playerName.toUpperCase()}` : ''}
                </Text>
              ) : turn?.playerName ? (
                <Text variant="overline" tone="faint">
                  {turn.playerName.toUpperCase()}
                </Text>
              ) : null}
              <Text variant="display">{headline}</Text>
            </View>
          </View>

          <PopIn from="rise" delay={120} style={styles.stats}>
            <StatTile label="Got it" value={correct} tint={color.correct} icon="check" />
            <StatTile label="Passed" value={passed} tint={color.pass} icon="pass" />
            <StatTile label="Points" value={score} tint={palette.blue} icon="trophy" />
          </PopIn>

          {reshuffled ? (
            <Text variant="caption" tone="muted">
              The decks ran out and were reshuffled.
            </Text>
          ) : null}

          <View style={styles.spacer} />
          <Button
            label={saving ? 'Saving' : 'Continue'}
            variant="primary"
            size="lg"
            disabled={saving}
            onPress={() => void done()}
          />
        </View>

        <View style={styles.listPane}>
          <Text variant="overline" tone="faint" style={styles.listLabel}>
            {results.length > 0 ? 'TAP A CARD TO FIX A MIS-TAP' : 'THIS ROUND'}
          </Text>
          <FlatList
            data={results}
            keyExtractor={(result) => result.cardId}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text variant="heading" align="center">
                  No cards this round
                </Text>
                <Text variant="caption" tone="muted" align="center">
                  The timer beat everyone to it. Next time!
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const card = findPoolCard(pool, item.cardId);
              const got = item.outcome === 'correct';
              const next: Outcome = got ? 'pass' : 'correct';
              const tint = got ? color.correct : color.pass;

              return (
                <Raised
                  face={color.background}
                  shade={color.line}
                  border={color.line}
                  radius={radius.md}
                  onPress={() => overrideResult(item.cardId, next)}
                  onPressIn={() => haptics.select()}
                  accessibilityLabel={`${card?.text ?? 'Card'}, ${got ? 'got it' : 'passed'}. Tap to change to ${
                    next === 'correct' ? 'got it' : 'passed'
                  }.`}
                  style={styles.row}
                  faceStyle={styles.rowFace}
                >
                  <View style={[styles.marker, { backgroundColor: tint }]}>
                    <Icon name={got ? 'check' : 'pass'} size={18} color={color.bone} weight={3.5} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text variant="heading" numberOfLines={1}>
                      {card?.text ?? 'Card'}
                    </Text>
                    {/* The clue-giver hint. Shown here, never on the card. */}
                    {card?.note ? (
                      <Text variant="caption" tone="faint" numberOfLines={1}>
                        {card.note}
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="label" style={{ color: tint }}>
                    {got ? 'GOT IT' : 'PASS'}
                  </Text>
                </Raised>
              );
            }}
          />
        </View>
      </View>
    </Screen>
  );
}

function verdict(correct: number): { headline: string; mood: MascotMood } {
  if (correct >= 8) return { headline: 'On fire!', mood: 'excited' };
  if (correct >= 5) return { headline: 'Great round!', mood: 'excited' };
  if (correct >= 2) return { headline: 'Nice one!', mood: 'happy' };
  if (correct === 1) return { headline: 'Off the mark!', mood: 'wink' };
  return { headline: 'Tough one', mood: 'sad' };
}

const styles = StyleSheet.create({
  panes: { flex: 1, flexDirection: 'row' },
  summary: {
    width: '42%',
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
    gap: space.md,
  },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  heroCopy: { flex: 1, gap: 2 },
  stats: { flexDirection: 'row', gap: space.sm },
  spacer: { flex: 1 },
  listPane: {
    flex: 1,
    borderLeftWidth: 2,
    borderLeftColor: color.line,
    backgroundColor: color.backgroundSoft,
  },
  listLabel: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  list: { paddingHorizontal: space.lg, paddingBottom: space.lg, flexGrow: 1 },
  row: { marginBottom: space.sm },
  rowFace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xs, padding: space.lg },
});
