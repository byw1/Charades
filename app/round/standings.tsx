import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { makeSessionId } from '@/game/ids';
import { playerStandings, standings } from '@/game/scoring';
import { rematch, sessionWinState, whoseTurn } from '@/game/session';
import { isJustPlay } from '@/game/teams';
import { useDatabase } from '@/hooks/useDatabase';
import { useRoundScreenMode } from '@/hooks/useRoundScreenMode';
import { useSessionStore } from '@/hooks/useSessionStore';
import { getDeck } from '@/storage/deckRepo';
import { saveSession } from '@/storage/sessionRepo';
import { Button } from '@/ui/Button';
import { Confetti } from '@/ui/Confetti';
import { cardTextOn } from '@/ui/contrast';
import { EmptyState } from '@/ui/EmptyState';
import { Mascot } from '@/ui/Mascot';
import { PopIn } from '@/ui/motion';
import { Footer, Screen } from '@/ui/Screen';
import { SectionLabel } from '@/ui/Section';
import { SpeechBubble } from '@/ui/SpeechBubble';
import { Text } from '@/ui/Text';
import { color, font, radius, space } from '@/ui/tokens';

/**
 * Where the game stands, between rounds and at the end.
 *
 * One screen rather than two. The difference between "standings" and "final
 * standings" is what the game is asking you to do next, not what it is showing
 * you, so the table stays put and only the header and footer change — and the
 * end gets confetti, because it should feel like an ending.
 *
 * Portrait: the phone comes off the forehead here and gets passed round.
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

  // Back to portrait: the round flow is over for now.
  useRoundScreenMode({ landscape: false });

  const winState = useMemo(
    () => (session ? sessionWinState(session, poolExhausted) : { over: false as const }),
    [session, poolExhausted],
  );

  const table = useMemo(() => (session ? standings(session) : []), [session]);
  const players = useMemo(() => (session ? playerStandings(session) : []), [session]);
  const solo = session ? isJustPlay(session.teams) : false;

  // Stamp the session complete as soon as it is over, so quitting from here
  // does not leave a finished game offering to resume.
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
      router.replace('/round/intro');
    } finally {
      setBusy(false);
    }
  };

  const goHome = () => {
    reset();
    router.dismissAll();
    router.replace('/');
  };

  const headline = winState.over
    ? solo
      ? 'Game over!'
      : winState.winners.length === 1
        ? `${winState.winners[0]!.teamName} win!`
        : 'It’s a tie!'
    : 'Standings';

  const bubble = winState.over
    ? solo
      ? `${table[0]?.score ?? 0} points together. Again?`
      : winState.winners.length === 1
        ? 'What a game. Rematch?'
        : `${winState.winners.map((w) => w.teamName).join(' and ')} are level!`
    : turn?.playerName
      ? `${turn.playerName}, you’re up next!`
      : `${played} ${played === 1 ? 'round' : 'rounds'} down. Keep going!`;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          <PopIn>
            <Mascot size={winState.over ? 130 : 96} mood={winState.over ? 'excited' : 'happy'} glyph={winState.over ? '★' : '?'} />
          </PopIn>
          <PopIn delay={100} style={styles.headerCopy}>
            <Text variant={winState.over ? 'hero' : 'display'} align="center" accessibilityRole="header">
              {headline}
            </Text>
            <SpeechBubble tail="bottom">
              <Text variant="heading" align="center">
                {bubble}
              </Text>
            </SpeechBubble>
          </PopIn>
        </View>

        {/* With one team the team row is just the total, so the per-player
            table is the interesting one and goes first. */}
        {solo ? null : (
          <View style={styles.section}>
            <SectionLabel>Teams</SectionLabel>
            {table.map((standing, index) => {
              const winner = winState.over && winState.winners.some((w) => w.teamId === standing.teamId);

              return (
                <PopIn key={standing.teamId} from="rise" delay={180 + index * 70}>
                  <View style={[styles.row, winner && styles.winnerRow]}>
                    <Rank place={index + 1} />
                    <View style={[styles.avatar, { backgroundColor: standing.teamColor }]}>
                      <Text style={[styles.avatarText, { color: cardTextOn(standing.teamColor) }]}>
                        {[...standing.teamName][0]?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View style={styles.rowBody}>
                      <Text variant="heading" numberOfLines={1}>
                        {standing.teamName}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {standing.correct} got · {standing.passed} {standing.passed === 1 ? 'pass' : 'passes'} ·{' '}
                        {standing.roundsPlayed} {standing.roundsPlayed === 1 ? 'round' : 'rounds'}
                      </Text>
                    </View>
                    <Text variant="display" style={winner ? styles.winnerScore : null}>
                      {standing.score}
                    </Text>
                  </View>
                </PopIn>
              );
            })}
          </View>
        )}

        {players.length > 0 ? (
          <View style={styles.section}>
            <SectionLabel>{solo ? 'Scores' : 'By player'}</SectionLabel>
            {players.map((player, index) => (
              <PopIn key={`${player.teamId}/${player.playerName}`} from="rise" delay={240 + index * 60}>
                <View style={styles.row}>
                  <Rank place={index + 1} />
                  <View style={styles.rowBody}>
                    <Text variant="heading" numberOfLines={1}>
                      {player.playerName}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {player.correct} got · {player.roundsPlayed} {player.roundsPlayed === 1 ? 'round' : 'rounds'}
                    </Text>
                  </View>
                  <Text variant="title">{player.score}</Text>
                </View>
              </PopIn>
            ))}
          </View>
        ) : null}

        {poolExhausted ? (
          <Text variant="caption" tone="muted" align="center" style={styles.note}>
            The decks ran out and were reshuffled.
          </Text>
        ) : null}
      </ScrollView>

      <Footer>
        {winState.over ? (
          <>
            <Button
              label={busy ? 'Starting' : 'Play again'}
              variant="primary"
              size="lg"
              icon="reset"
              disabled={busy}
              onPress={() => void playAgain()}
            />
            <Button label="Home" icon="home" onPress={goHome} />
          </>
        ) : (
          <>
            <Button
              label={turn?.playerName ? `Next · ${turn.playerName}` : 'Next round'}
              variant="primary"
              size="lg"
              icon="play"
              onPress={() => router.replace('/round/intro')}
            />
            <Button label="Finish later" onPress={goHome} accessibilityHint="Your game is saved" />
          </>
        )}
      </Footer>

      {winState.over ? <Confetti /> : null}
    </Screen>
  );
}

const MEDALS = [
  { face: color.gold, shade: color.goldShade },
  { face: color.silver, shade: color.silverShade },
  { face: color.bronze, shade: color.bronzeShade },
];

/** First three get a medal; everyone else gets a plain number. */
function Rank({ place }: { place: number }) {
  const medal = MEDALS[place - 1];

  if (!medal) {
    return (
      <View style={styles.rank}>
        <Text variant="heading" tone="faint">
          {place}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.rank, styles.medal, { backgroundColor: medal.face, borderColor: medal.shade }]}
      accessibilityLabel={`Place ${place}`}
    >
      <Text style={styles.medalText}>{place}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: space.lg, gap: space.lg },
  header: { alignItems: 'center', gap: space.sm, paddingTop: space.lg, paddingHorizontal: space.lg },
  headerCopy: { alignItems: 'center', gap: space.md },
  section: { gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: 20,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 4,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: color.line,
    backgroundColor: color.background,
  },
  winnerRow: {
    borderColor: color.gold,
    backgroundColor: '#FFFBEA',
  },
  winnerScore: { color: color.goldShade },
  rank: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  medal: { borderRadius: 16, borderBottomWidth: 3 },
  medalText: { fontFamily: font.black, fontSize: 16, lineHeight: 20, color: color.ink },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: font.black, fontSize: 20, lineHeight: 26 },
  rowBody: { flex: 1, gap: 1 },
  note: { paddingHorizontal: space.lg },
});
