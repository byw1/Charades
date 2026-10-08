import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { forfeitFor } from '@/game/forfeits';
import { makeSessionId } from '@/game/ids';
import { playerStandings, standings } from '@/game/scoring';
import { canChangeDecks, rematch, sessionWinState, whoseTurn } from '@/game/session';
import { isJustPlay } from '@/game/teams';
import { nextRoundSeconds } from '@/game/types';
import { hatProgress, phaseInfo } from '@/game/threeRounds';
import { useDatabase } from '@/hooks/useDatabase';
import { hasClips } from '@/media/reels';
import { useRoundScreenMode } from '@/hooks/useRoundScreenMode';
import { useSessionStore } from '@/hooks/useSessionStore';
import { useSounds } from '@/hooks/useSounds';
import { getDeck } from '@/storage/deckRepo';
import { discardOtherUnfinishedSessions, saveSession } from '@/storage/sessionRepo';
import { Button } from '@/ui/Button';
import { Confetti } from '@/ui/Confetti';
import { EmptyState } from '@/ui/EmptyState';
import { useLayout } from '@/ui/layout';
import { Mascot } from '@/ui/Mascot';
import { PopIn } from '@/ui/motion';
import { Footer, Screen } from '@/ui/Screen';
import { SectionLabel } from '@/ui/Section';
import { Avatar, ChatLine } from '@/ui/Social';
import { StatTile } from '@/ui/StatTile';
import { Text } from '@/ui/Text';
import { color, font, gutter, palette, radius, space } from '@/ui/tokens';

/**
 * Where the game stands, between rounds and at the end.
 *
 * One screen rather than two. The difference between "standings" and "final
 * standings" is what the game is asking you to do next, not what it is showing
 * you, so the table stays put and only the header and footer change — and the
 * end gets confetti, because it should feel like an ending.
 *
 * The phone comes off the forehead here and gets passed round, so it lays
 * out for whichever way it ends up being held.
 */
export default function StandingsScreen() {
  const router = useRouter();
  const database = useDatabase();

  const session = useSessionStore((s) => s.session);
  const poolExhausted = useSessionStore((s) => s.poolExhausted);
  const completeSessionInStore = useSessionStore((s) => s.completeSession);
  const startSession = useSessionStore((s) => s.startSession);
  const reset = useSessionStore((s) => s.reset);

  const [busy, setBusy] = useState(false);
  // Clips are saved a moment after a round ends, so this checks once shortly
  // after the screen opens rather than only on the first frame.
  const [clips, setClips] = useState(false);
  const sessionId = session?.id;
  useEffect(() => {
    if (!sessionId) return;
    const check = () => setClips(hasClips(sessionId));
    check();
    const id = setTimeout(check, 1_500);
    return () => clearTimeout(id);
  }, [sessionId]);

  useRoundScreenMode();
  const { short } = useLayout();
  const setRoundSeconds = useSessionStore((st) => st.setRoundSeconds);

  const winState = useMemo(
    () => (session ? sessionWinState(session, poolExhausted) : { over: false as const }),
    [session, poolExhausted],
  );

  const table = useMemo(() => (session ? standings(session) : []), [session]);
  const players = useMemo(() => (session ? playerStandings(session) : []), [session]);
  const solo = session ? isJustPlay(session.teams) : false;
  const hat = useMemo(() => (session?.hat ? hatProgress(session) : null), [session]);

  // Stamp the session complete as soon as it is over, so quitting from here
  // does not leave a finished game offering to resume.
  // A fanfare as the final standings land.
  const sound = useSounds();
  useEffect(() => {
    if (winState.over) sound('win');
  }, [sound, winState.over]);

  useEffect(() => {
    if (!winState.over || !session || session.completedAt || database.status !== 'ready') return;
    void completeSessionInStore(database.db, new Date().toISOString());
  }, [winState.over, session, database, completeSessionInStore]);

  if (!session) {
    return (
      <Screen>
        <EmptyState title="No game in progress" body="Start a new one from the home screen." />
        <Footer>
          <Button label="Home" variant="primary" icon="home" onPress={() => router.replace('/')} />
        </Footer>
      </Screen>
    );
  }

  const turn = whoseTurn(session);
  const played = session.rounds.filter((r) => r.endedAt !== null).length;
  const loser = winState.over && session.settings.forfeits ? lastPlace(table, players, solo) : null;

  const playAgain = async () => {
    if (database.status !== 'ready' || busy) return;
    setBusy(true);

    try {
      const next = rematch(session, makeSessionId(), new Date().toISOString());

      const loaded = await Promise.all(next.deckIds.map((id) => getDeck(database.db, id)));
      const decks = loaded.flatMap((deck) =>
        deck ? [{ id: deck.id, name: deck.name, accentColor: deck.accentColor, cards: deck.cards }] : [],
      );

      const created = startSession({
        id: next.id,
        decks,
        teams: next.teams,
        settings: next.settings,
        now: next.createdAt,
        seed: Date.now() >>> 0,
      });

      await saveSession(database.db, created);
      // Starting over mid-game leaves the old game behind for good.
      await discardOtherUnfinishedSessions(database.db, created.id);
      router.replace('/round/intro');
    } finally {
      setBusy(false);
    }
  };

  const confirmRestart = () =>
    Alert.alert('Start over?', 'Scores go back to zero. Same players, same decks.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Start over', style: 'destructive', onPress: () => void playAgain() },
    ]);

  const goHome = () => {
    reset();
    router.dismissAll();
    router.replace('/');
  };

  const headline = winState.over
    ? solo
      ? 'GG 🎉'
      : winState.winners.length === 1
        ? `${winState.winners[0]!.teamName} win 👑`
        : 'It’s a tie 🤝'
    : 'Standings';

  const bubble = winState.over
    ? solo
      ? `${table[0]?.score ?? 0} points between you. Run it back?`
      : winState.winners.length === 1
        ? (table[0]?.score ?? 0) - (table[1]?.score ?? 0) <= 3
          ? 'That was close. Rematch?'
          : 'Not even close. Rematch?'
        : `${winState.winners.map((w) => w.teamName).join(' and ')} are level. Settle it?`
    : turn?.playerName
      ? `${turn.playerName}, you’re up next.`
      : `${played} ${played === 1 ? 'round' : 'rounds'} down. Keep it going.`;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          <PopIn style={styles.sticker}>
            <Mascot size={winState.over ? 120 : 84} mood={winState.over ? 'excited' : 'happy'} glyph={winState.over ? '★' : '?'} poke />
          </PopIn>
          <PopIn delay={80} style={styles.headerCopy}>
            <Text variant="hero" accessibilityRole="header">
              {headline}
            </Text>
            <ChatLine>{bubble}</ChatLine>
          </PopIn>
        </View>

        {hat && !hat.done ? (
          <PopIn from="rise" delay={120} style={styles.hat}>
            <Text style={styles.hatEmoji} allowFontScaling={false}>
              {phaseInfo(hat.phase).emoji}
            </Text>
            <View style={styles.rowBody}>
              <Text variant="overline" tone="muted">
                PHASE {hat.phase} OF 3 · {phaseInfo(hat.phase).title.toUpperCase()}
              </Text>
              <Text variant="heading">
                {hat.remaining.length} of {hat.total} cards left in the hat
              </Text>
              <View style={styles.hatTrack}>
                <View style={[styles.hatFill, { width: `${(hat.guessed / Math.max(1, hat.total)) * 100}%` }]} />
              </View>
            </View>
          </PopIn>
        ) : null}

        {loser ? (
          <PopIn from="rise" delay={140} style={styles.forfeit}>
            <Text variant="overline" style={{ color: palette.pink }}>
              😈 FORFEIT FOR {loser.toUpperCase()}
            </Text>
            <Text variant="heading">{forfeitFor(session.id)}</Text>
          </PopIn>
        ) : null}

        {/* Rounds too long or too short? Change it for the next one. */}
        {winState.over ? null : (
          <View style={styles.timerRow}>
            <Button
              label={`Next round: ${session.settings.roundSeconds}s`}
              icon="timer"
              size="sm"
              onPress={() =>
                database.status === 'ready'
                  ? void setRoundSeconds(database.db, nextRoundSeconds(session.settings.roundSeconds))
                  : undefined
              }
              accessibilityHint="Tap to cycle 30, 60 and 90 seconds"
            />
          </View>
        )}

        {/* With one team the team row is just the total, so the per-player
            table is the interesting one and goes first. */}
        {solo ? null : (
          <View style={styles.section}>
            <SectionLabel>Teams</SectionLabel>
            {table.map((standing, index) => {
              const winner = winState.over && winState.winners.some((w) => w.teamId === standing.teamId);

              return (
                <PopIn key={standing.teamId} from="rise" delay={160 + index * 70}>
                  <View style={[styles.row, winner && styles.winnerRow]}>
                    <Text style={styles.rank}>{index + 1}</Text>
                    <Avatar name={standing.teamName} tint={standing.teamColor} badge={medal(index, winner)} />
                    <View style={styles.rowBody}>
                      <Text variant="heading" numberOfLines={1}>
                        {standing.teamName}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {standing.correct} got · {standing.passed} {standing.passed === 1 ? 'pass' : 'passes'} ·{' '}
                        {standing.roundsPlayed} {standing.roundsPlayed === 1 ? 'round' : 'rounds'}
                      </Text>
                    </View>
                    <Text style={[styles.score, winner && { color: color.brand }]}>{standing.score}</Text>
                  </View>
                </PopIn>
              );
            })}
          </View>
        )}

        {/* One team with no names has no table to show, so show the total. */}
        {solo && players.length === 0 && table[0] ? (
          <PopIn from="rise" delay={160} style={styles.totals}>
            <StatTile label="points" value={table[0].score} tint={color.brand} />
            <StatTile label="got it" value={table[0].correct} tint={color.correct} />
            <StatTile label={played === 1 ? 'round' : 'rounds'} value={played} tint={palette.blue} />
          </PopIn>
        ) : null}

        {players.length > 0 ? (
          <View style={styles.section}>
            <SectionLabel>{solo ? 'Scores' : 'By player'}</SectionLabel>
            {players.map((player, index) => (
              <PopIn key={`${player.teamId}/${player.playerName}`} from="rise" delay={220 + index * 60}>
                <View style={styles.row}>
                  <Text style={styles.rank}>{index + 1}</Text>
                  <Avatar
                    name={player.playerName}
                    tint={PLAYER_TINTS[index % PLAYER_TINTS.length] ?? palette.purple}
                    badge={medal(index, false)}
                  />
                  <View style={styles.rowBody}>
                    <Text variant="heading" numberOfLines={1}>
                      {player.playerName}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {player.correct} got · {player.roundsPlayed} {player.roundsPlayed === 1 ? 'round' : 'rounds'}
                    </Text>
                  </View>
                  <Text style={styles.score}>{player.score}</Text>
                </View>
              </PopIn>
            ))}
          </View>
        ) : null}

        {poolExhausted ? (
          <Text variant="caption" tone="muted" align="center" style={styles.note}>
            The decks ran out and got reshuffled.
          </Text>
        ) : null}
      </ScrollView>

      <Footer>
        {clips ? (
          <Button label="Watch the highlights" icon="play" onPress={() => router.push(`/reel?session=${session.id}`)} />
        ) : null}
        {winState.over ? (
          <>
            <Button
              label={busy ? 'Starting…' : 'Run it back'}
              variant="primary"
              size="lg"
              icon="reset"
              disabled={busy}
              onPress={() => void playAgain()}
            />
            <View style={styles.footerRow}>
              <Button label="Wrapped" icon="share" onPress={() => router.push('/wrapped')} style={styles.grow} />
              <Button label="Home" icon="home" onPress={goHome} style={styles.grow} />
            </View>
          </>
        ) : (
          <>
            <Button
              label={turn?.playerName ? `Next up: ${turn.playerName}` : 'Next round'}
              variant="primary"
              size="lg"
              icon="play"
              onPress={() => router.replace('/round/intro')}
            />
            {/* Someone's miles ahead, or the decks are getting stale: fix it
                without leaving the game. */}
            {short ? (
              // Sideways the footer is already a row, so these join it.
              <Button label="Start over" icon="reset" onPress={confirmRestart} />
            ) : (
              <View style={styles.footerRow}>
                <Button label="Start over" icon="reset" size="sm" onPress={confirmRestart} style={styles.grow} />
                {canChangeDecks(session) ? (
                  <Button label="Change decks" icon="decks" size="sm" onPress={() => router.push('/new/decks?change=1')} style={styles.grow} />
                ) : null}
              </View>
            )}
            {short && canChangeDecks(session) ? (
              <Button label="Decks" icon="decks" onPress={() => router.push('/new/decks?change=1')} />
            ) : null}
            <Button label="Finish later" onPress={goHome} accessibilityHint="Your game is saved" />
          </>
        )}
      </Footer>

      {winState.over ? <Confetti /> : null}
    </Screen>
  );
}

/**
 * Who does the forfeit: the bottom team, or the bottom player when everyone
 * played as one. Nobody when last place is shared with first — a tie at the
 * top is not a loss.
 */
function lastPlace(
  table: { teamName: string; score: number }[],
  players: { playerName: string; score: number }[],
  solo: boolean,
): string | null {
  const rows = solo
    ? players.map((p) => ({ name: p.playerName, score: p.score }))
    : table.map((t) => ({ name: t.teamName, score: t.score }));
  if (rows.length < 2) return null;
  const last = rows[rows.length - 1]!;
  return last.score === rows[0]!.score ? null : last.name;
}

const PLAYER_TINTS = [palette.pink, palette.blue, palette.yellow, palette.purple, palette.teal, palette.red];

/** The crown goes to the winner; second and third get the medals. */
function medal(index: number, winner: boolean): string | undefined {
  if (winner) return '👑';
  return index === 1 ? '🥈' : index === 2 ? '🥉' : undefined;
}

const styles = StyleSheet.create({
  body: { paddingBottom: space.lg, gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.lg, paddingHorizontal: gutter },
  sticker: { transform: [{ rotate: '-8deg' }] },
  headerCopy: { flex: 1, gap: space.md },
  section: { gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: gutter,
    paddingHorizontal: space.md - 4,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  winnerRow: { borderWidth: 2, borderColor: color.brand },
  rank: { fontFamily: font.heavy, fontSize: 14, lineHeight: 18, color: color.textFaint, width: 16, textAlign: 'center' },
  rowBody: { flex: 1, gap: 1 },
  score: { fontFamily: font.display, fontSize: 32, lineHeight: 36, color: color.text },
  note: { paddingHorizontal: gutter },
  footerRow: { flexDirection: 'row', gap: 10 },
  totals: { flexDirection: 'row', gap: space.sm, paddingHorizontal: gutter },
  grow: { flex: 1 },
  timerRow: { flexDirection: 'row', paddingHorizontal: gutter },
  hat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: gutter,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  hatEmoji: { fontSize: 40, lineHeight: 48 },
  hatTrack: { height: 8, borderRadius: 4, backgroundColor: color.surfaceRaised, overflow: 'hidden', marginTop: 6 },
  hatFill: { height: 8, borderRadius: 4, backgroundColor: color.brand },
  forfeit: {
    gap: space.xs,
    marginHorizontal: gutter,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: palette.pink,
    backgroundColor: color.surface,
  },
});
