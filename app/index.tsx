import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { standings } from '@/game/scoring';
import { isJustPlay } from '@/game/teams';
import type { Session } from '@/game/types';
import { useDatabase } from '@/hooks/useDatabase';
import { useNewGameStore } from '@/hooks/useNewGameStore';
import { useSessionStore } from '@/hooks/useSessionStore';
import { useSettingsStore } from '@/hooks/useSettings';
import { getDeck } from '@/storage/deckRepo';
import { getResumableSession } from '@/storage/sessionRepo';
import { Button } from '@/ui/Button';
import { Mascot } from '@/ui/Mascot';
import { PopIn } from '@/ui/motion';
import { Raised } from '@/ui/Raised';
import { Screen } from '@/ui/Screen';
import { SpeechBubble } from '@/ui/SpeechBubble';
import { Text } from '@/ui/Text';
import { IconButton } from '@/ui/TopBar';
import { color, font, palette, radius, space } from '@/ui/tokens';

const GREETINGS = [
  'Ready for a round?',
  'Card on your head. Friends shout clues. Go!',
  'Guess what’s on my forehead!',
  'Let’s get loud.',
  'Who’s holding the phone first?',
];

export default function HomeScreen() {
  const router = useRouter();
  const database = useDatabase();
  const onboarded = useSettingsStore((s) => s.onboarded);

  const resumeSession = useSessionStore((s) => s.resumeSession);
  const resetDraft = useNewGameStore((s) => s.reset);

  const [saved, setSaved] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)] ?? '');

  // Checked on focus rather than once, so finishing a game clears the resume
  // card without needing a restart.
  useFocusEffect(
    useCallback(() => {
      if (database.status !== 'ready') return;

      let cancelled = false;
      const { db } = database;

      void (async () => {
        const session = await getResumableSession(db);
        if (!cancelled) setSaved(session);
      })();

      return () => {
        cancelled = true;
      };
    }, [database]),
  );

  if (!onboarded) return <Redirect href="/welcome" />;

  const resume = async () => {
    if (!saved || database.status !== 'ready' || busy) return;
    setBusy(true);

    try {
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
    } finally {
      setBusy(false);
    }
  };

  const newGame = () => {
    resetDraft();
    router.push('/new/decks');
  };

  return (
    <Screen>
      <View style={styles.top}>
        <Text style={styles.wordmark} accessibilityRole="header">
          deckhead
        </Text>
        <IconButton icon="settings" label="Settings" onPress={() => router.push('/settings')} />
      </View>

      <ScrollView contentContainerStyle={styles.body} bounces={false}>
        <View style={styles.hero}>
          <PopIn delay={150}>
            <SpeechBubble tail="bottom">
              <Text variant="heading" align="center">
                {saved ? 'Welcome back! Your game is waiting.' : greeting}
              </Text>
            </SpeechBubble>
          </PopIn>
          <PopIn>
            <Mascot size={220} mood={saved ? 'excited' : 'happy'} />
          </PopIn>
        </View>

        {saved ? (
          <PopIn from="rise" delay={250}>
            <ResumeCard session={saved} onPress={() => void resume()} disabled={busy} />
          </PopIn>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        <PopIn from="rise" delay={200}>
          <Button
            label={saved ? 'New game' : 'Play'}
            variant={saved ? 'secondary' : 'primary'}
            icon={saved ? 'plus' : 'play'}
            size="lg"
            onPress={newGame}
          />
        </PopIn>
        <PopIn from="rise" delay={280}>
          <View style={styles.row}>
            <Button label="Decks" icon="decks" onPress={() => router.push('/decks')} style={styles.grow} />
            <Button label="Rules" icon="help" onPress={() => router.push('/welcome?replay=1')} style={styles.grow} />
          </View>
        </PopIn>
        <Text variant="caption" tone="faint" align="center">
          No accounts · no ads · works offline
        </Text>
      </View>
    </Screen>
  );
}

function ResumeCard({
  session,
  onPress,
  disabled,
}: {
  session: Session;
  onPress: () => void;
  disabled: boolean;
}) {
  const played = session.rounds.filter((r) => r.endedAt !== null).length;
  const table = standings(session);
  const solo = isJustPlay(session.teams);

  const summary =
    played === 0
      ? 'Not started yet'
      : solo
        ? `${played} ${played === 1 ? 'round' : 'rounds'} in · ${table[0]?.score ?? 0} points`
        : table
            .slice(0, 2)
            .map((s) => `${s.teamName} ${s.score}`)
            .join('  ·  ');

  return (
    <Raised
      face={palette.yellowLight}
      shade={palette.yellowShade}
      border={palette.yellow}
      radius={radius.lg}
      style={styles.resume}
      faceStyle={styles.resumeFace}
    >
      <Text variant="overline" style={{ color: palette.yellowShade }}>
        GAME IN PROGRESS
      </Text>
      <Text variant="heading">{summary}</Text>
      <Button label="Carry on" variant="blue" icon="play" onPress={onPress} disabled={disabled} />
    </Raised>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: space.sm,
    paddingTop: space.sm,
  },
  wordmark: {
    fontFamily: font.black,
    fontSize: 30,
    lineHeight: 36,
    color: color.brand,
    letterSpacing: -0.8,
  },
  body: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: space.lg,
    gap: space.lg,
  },
  hero: {
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
  },
  resume: { marginHorizontal: 20 },
  resumeFace: { padding: space.md, gap: space.sm },
  actions: {
    paddingHorizontal: 20,
    paddingBottom: space.sm,
    gap: space.sm + 4,
  },
  row: { flexDirection: 'row', gap: space.sm + 4 },
  grow: { flex: 1 },
});
