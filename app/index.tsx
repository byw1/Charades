import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { DeckSummary } from '@/decks/types';
import { friendBoard, topRivalry, type Friend, type Rivalry } from '@/game/friends';
import { planStreakReminder } from '@/game/reminders';
import { playStats, type PlayStats } from '@/game/stats';
import { standings } from '@/game/scoring';
import { isJustPlay, makeJustPlayTeam } from '@/game/teams';
import { settingsForMode, type Session } from '@/game/types';
import { DecksPage } from '@/home/DecksPage';
import { MePage } from '@/home/MePage';
import { mixLens, PlayPage, type Lens } from '@/home/PlayPage';
import { useDatabase } from '@/hooks/useDatabase';
import { useNewGameStore } from '@/hooks/useNewGameStore';
import { useSessionStore } from '@/hooks/useSessionStore';
import { useSettingsStore } from '@/hooks/useSettings';
import { useStartGame } from '@/hooks/useStartGame';
import { getDeck, listDeckSummaries, searchDeckSummaries } from '@/storage/deckRepo';
import { syncStreakReminder } from '@/media/reminders';
import { getResumableSession, listSessions } from '@/storage/sessionRepo';
import { BottomBar, useBottomBarHeight, type BottomTab } from '@/ui/BottomBar';
import { Tap } from '@/ui/Tap';
import { Text } from '@/ui/Text';
import { color, font, radius, space } from '@/ui/tokens';

const TABS: readonly BottomTab[] = [
  { key: 'decks', label: 'Decks', icon: 'decks' },
  { key: 'play', label: 'Play', icon: 'play' },
  { key: 'me', label: 'You', icon: 'user' },
];

const PLAY = 1;

/**
 * Home: three pages side by side — Decks, Play, You — and you swipe between
 * them. It opens on Play, the way a camera app opens on the camera, because
 * the thing almost everyone wants is to start a game.
 */
export default function HomeScreen() {
  const router = useRouter();
  const database = useDatabase();
  const onboarded = useSettingsStore((s) => s.onboarded);
  const quickMode = useSettingsStore((s) => s.quickMode);
  const setSetting = useSettingsStore((s) => s.set);
  const setGameMode = useNewGameStore((s) => s.setGameMode);
  const { width } = useWindowDimensions();
  const pager = useRef<ScrollView>(null);
  const bar = useBottomBarHeight();

  const resumeSession = useSessionStore((s) => s.resumeSession);
  const resetDraft = useNewGameStore((s) => s.reset);
  const toggleDeck = useNewGameStore((s) => s.toggleDeck);
  const { start, starting } = useStartGame();

  const [page, setPage] = useState(PLAY);
  const [all, setAll] = useState<DeckSummary[] | null>(null);
  const [found, setFound] = useState<DeckSummary[] | null>(null);
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState<Session | null>(null);
  const [stats, setStats] = useState<PlayStats | null>(null);
  const [friends, setFriends] = useState<{ board: Friend[]; rivalry: Rivalry | null }>({ board: [], rivalry: null });
  const [lensIndex, setLensIndex] = useState(0);

  // Everything is reloaded on focus, so coming back from a game, the editor or
  // an import shows what just changed.
  useFocusEffect(
    useCallback(() => {
      if (database.status !== 'ready') return;

      let cancelled = false;
      const { db } = database;

      void (async () => {
        const [decks, session, history] = await Promise.all([
          listDeckSummaries(db),
          getResumableSession(db),
          listSessions(db),
        ]);
        if (cancelled) return;
        setAll(decks);
        setSaved(session);
        const now = new Date();
        const current = playStats(history, now);
        setStats(current);
        // Re-planned on every return home, so a game just played moves the
        // reminder on to tomorrow.
        void syncStreakReminder(planStreakReminder(current, now), useSettingsStore.getState().streakReminders);
        setFriends({ board: friendBoard(history), rivalry: topRivalry(history) });
      })();

      return () => {
        cancelled = true;
      };
    }, [database]),
  );

  useFocusEffect(
    useCallback(() => {
      if (database.status !== 'ready' || !query.trim()) {
        setFound(null);
        return;
      }
      let cancelled = false;
      void searchDeckSummaries(database.db, query).then((results) => {
        if (!cancelled) setFound(results);
      });
      return () => {
        cancelled = true;
      };
    }, [database, query]),
  );

  const lenses = useMemo<Lens[]>(() => {
    if (!all) return [];
    const decks = all.map((d) => ({
      key: d.id,
      name: d.name,
      accent: d.accentColor,
      deckIds: [d.id],
      cardCount: d.cardCount,
    }));
    return [mixLens(all), ...decks];
  }, [all]);

  if (!onboarded) return <Redirect href="/welcome" />;

  const goTo = (index: number) => {
    pager.current?.scrollTo({ x: index * width, animated: true });
    setPage(index);
  };

  const quickPlay = (lens: Lens) => {
    void start({ deckIds: lens.deckIds, teams: [makeJustPlayTeam()], settings: settingsForMode(quickMode) });
  };

  const setup = (lens: Lens) => {
    resetDraft();
    setGameMode(quickMode);
    for (const id of lens.deckIds) toggleDeck(id);
    router.push(lens.key === 'mix' ? '/new/decks' : '/new/teams');
  };

  const resume = async () => {
    if (!saved || database.status !== 'ready') return;
    const loaded = await Promise.all(saved.deckIds.map((id) => getDeck(database.db, id)));
    const decks = loaded.flatMap((deck) =>
      deck ? [{ id: deck.id, name: deck.name, accentColor: deck.accentColor, cards: deck.cards }] : [],
    );
    // A deck deleted since the game started would leave nothing to draw.
    if (decks.length === 0) {
      setSaved(null);
      return;
    }
    resumeSession(saved, decks, Date.now() >>> 0);
    router.push('/round/standings');
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentOffset={{ x: PLAY * width, y: 0 }}
        onLayout={() => pager.current?.scrollTo({ x: page * width, animated: false })}
        scrollEventThrottle={16}
        onScroll={(event) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / width);
          if (next !== page && next >= 0 && next < TABS.length) setPage(next);
        }}
      >
        <DecksPage
          decks={query.trim() ? found : all}
          error={database.status === 'error' ? database.message : undefined}
          query={query}
          onQuery={setQuery}
          onOpen={(id) => router.push(`/decks/${id}`)}
          onNew={() => router.push('/decks/edit/new')}
          onImport={() => router.push('/decks/import')}
          onGroup={() => router.push('/decks/group')}
          bottomInset={bar}
        />
        <PlayPage
          lenses={lenses}
          selected={Math.min(lensIndex, Math.max(0, lenses.length - 1))}
          onSelect={setLensIndex}
          onPlay={quickPlay}
          onSetup={setup}
          onOpenDeck={(lens) => {
            const id = lens.deckIds[0];
            if (id) router.push(`/decks/${id}`);
          }}
          streak={stats?.streak ?? 0}
          playedToday={stats?.playedToday ?? false}
          onMe={() => goTo(2)}
          resume={saved ? <ResumeBanner session={saved} onPress={() => void resume()} /> : null}
          starting={starting}
          bottomInset={bar}
          mode={quickMode}
          onMode={(mode) => setSetting('quickMode', mode)}
        />
        <MePage
          stats={stats}
          friends={friends.board}
          rivalry={friends.rivalry}
          onWrapped={() => router.push('/wrapped')}
          onSettings={() => router.push('/settings')}
          onRules={() => router.push('/welcome?replay=1')}
          bottomInset={bar}
        />
      </ScrollView>

      <View style={styles.bar}>
        <BottomBar tabs={TABS} active={page} onSelect={goTo} />
      </View>
    </View>
  );
}

function ResumeBanner({ session, onPress }: { session: Session; onPress: () => void }) {
  const played = session.rounds.filter((r) => r.endedAt !== null).length;
  const table = standings(session);
  const summary =
    played === 0
      ? 'Not started yet'
      : isJustPlay(session.teams)
        ? `${played} ${played === 1 ? 'round' : 'rounds'} · ${table[0]?.score ?? 0} pts`
        : table
            .slice(0, 2)
            .map((s) => `${s.teamName} ${s.score}`)
            .join(' · ');

  return (
    <Tap onPress={onPress} squish={0.97} accessibilityLabel={`Game in progress, ${summary}. Resume.`} contentStyle={styles.banner}>
      <View style={styles.bannerDot} />
      <View style={styles.bannerCopy}>
        <Text style={styles.bannerTitle}>Game in progress</Text>
        <Text variant="caption" style={styles.bannerSub} numberOfLines={1}>
          {summary}
        </Text>
      </View>
      <View style={styles.bannerButton}>
        <Text style={styles.bannerButtonText}>Resume</Text>
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    backgroundColor: color.scrim,
    borderRadius: radius.pill,
    paddingLeft: space.md,
    paddingRight: 6,
    paddingVertical: 6,
  },
  bannerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.correct },
  bannerCopy: { flex: 1 },
  bannerTitle: { fontFamily: font.heavy, fontSize: 14, lineHeight: 18, color: color.bone },
  bannerSub: { color: 'rgba(255,255,255,0.8)' },
  bannerButton: { backgroundColor: color.bone, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9 },
  bannerButtonText: { fontFamily: font.heavy, fontSize: 14, lineHeight: 18, color: color.ink },
});
