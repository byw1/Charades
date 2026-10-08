import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { DEFAULT_DECK_EMOJI, MIN_PLAYABLE_CARDS, type DeckSummary } from '@/decks/types';
import { friendBoard, topRivalry, type Friend, type Rivalry } from '@/game/friends';
import { playStats, type PlayStats } from '@/game/stats';
import { standings } from '@/game/scoring';
import { isJustPlay, makeJustPlayTeam } from '@/game/teams';
import { nextRoundSeconds, settingsForMode, type Session } from '@/game/types';
import { CardPreview } from '@/home/CardPreview';
import { DECK_SORTS, orderDecks, playCounts } from '@/home/deckOrder';
import { DecksPage } from '@/home/DecksPage';
import { MePage } from '@/home/MePage';
import { mixLens, PlayPage, type Lens } from '@/home/PlayPage';
import { useDatabase } from '@/hooks/useDatabase';
import { useNewGameStore } from '@/hooks/useNewGameStore';
import { useSessionStore } from '@/hooks/useSessionStore';
import { useSettingsStore } from '@/hooks/useSettings';
import { useStartGame } from '@/hooks/useStartGame';
import { getDeck, listDeckSummaries, searchDeckSummaries, setFavorite } from '@/storage/deckRepo';
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
  const setDraftSeconds = useNewGameStore((s) => s.setRoundSeconds);
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
  const [plays, setPlays] = useState<ReadonlyMap<string, number>>(() => new Map());
  const [peeking, setPeeking] = useState<Lens | null>(null);
  const deckSort = useSettingsStore((s) => s.deckSort);
  const quickSeconds = useSettingsStore((s) => s.quickSeconds);

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
        setFriends({ board: friendBoard(history), rivalry: topRivalry(history) });
        setPlays(playCounts(history));
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

  // Favourites first, then the chosen sort, on the carousel and in the grid.
  const ordered = useMemo(() => (all ? orderDecks(all, deckSort, plays) : null), [all, deckSort, plays]);
  const orderedFound = useMemo(() => (found ? orderDecks(found, deckSort, plays) : null), [found, deckSort, plays]);

  const lenses = useMemo<Lens[]>(() => {
    if (!ordered) return [];
    const decks = ordered.map((d) => ({
      key: d.id,
      name: d.name,
      accent: d.accentColor,
      deckIds: [d.id],
      cardCount: d.cardCount,
      emoji: d.emoji ?? DEFAULT_DECK_EMOJI,
      favorite: d.favorite,
    }));
    return [mixLens(ordered), ...decks];
  }, [ordered]);

  if (!onboarded) return <Redirect href="/welcome" />;

  const goTo = (index: number) => {
    pager.current?.scrollTo({ x: index * width, animated: true });
    setPage(index);
  };

  // One tap plays an endless game: keep passing the phone round until you
  // stop. Three-round mode still ends when the hat is cleared.
  const quickPlay = (lens: Lens) => {
    const settings = { ...settingsForMode(quickMode), roundSeconds: quickSeconds };
    void start({
      deckIds: lens.deckIds,
      teams: [makeJustPlayTeam()],
      settings: quickMode === 'threeRounds' ? settings : { ...settings, winCondition: { kind: 'endless' } },
    });
  };

  const setup = (lens: Lens) => {
    resetDraft();
    setGameMode(quickMode);
    // Setup starts from the round length already picked on Play.
    setDraftSeconds(quickSeconds);
    for (const id of lens.deckIds) toggleDeck(id);
    router.push(lens.key === 'mix' ? '/new/decks' : '/new/teams');
  };

  const favorite = async (lens: Lens) => {
    const id = lens.deckIds[0];
    if (!id || database.status !== 'ready' || !all) return;
    await setFavorite(database.db, id, !lens.favorite);
    const next = all.map((d) => (d.id === id ? { ...d, favorite: !lens.favorite } : d));
    setAll(next);
    // The deck moves in the order; keep it under the shutter as it does.
    // Mix is lens 0, so a deck's lens is its place in the order plus one.
    setLensIndex(orderDecks(next, deckSort, plays).findIndex((d) => d.id === id) + 1);
  };

  const chooseSort = () =>
    Alert.alert(
      'Order decks by',
      'Favourites always come first.',
      [
        ...DECK_SORTS.map((option) => ({
          text: option.key === deckSort ? `${option.label} ✓` : option.label,
          onPress: () => setSetting('deckSort', option.key),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );

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
          decks={query.trim() ? orderedFound : ordered}
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
          onPreview={setPeeking}
          onFavorite={(lens) => void favorite(lens)}
          onEdit={(lens) => {
            const id = lens.deckIds[0];
            if (id) router.push(`/decks/edit/${id}`);
          }}
          sortLabel={DECK_SORTS.find((option) => option.key === deckSort)?.label ?? 'Sort'}
          onSort={chooseSort}
          roundSeconds={quickSeconds}
          onRoundSeconds={() => setSetting('quickSeconds', nextRoundSeconds(quickSeconds))}
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

      <CardPreview
        visible={peeking !== null}
        title={peeking?.name ?? ''}
        deckIds={peeking?.deckIds ?? []}
        shuffle={peeking?.key === 'mix'}
        onClose={() => setPeeking(null)}
        onPlay={
          peeking && peeking.cardCount >= MIN_PLAYABLE_CARDS
            ? () => {
                const lens = peeking;
                setPeeking(null);
                quickPlay(lens);
              }
            : undefined
        }
        onEdit={
          peeking && peeking.key !== 'mix'
            ? () => {
                const id = peeking.deckIds[0];
                setPeeking(null);
                if (id) router.push(`/decks/edit/${id}`);
              }
            : undefined
        }
      />
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
  screen: { flex: 1, backgroundColor: color.chrome },
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
