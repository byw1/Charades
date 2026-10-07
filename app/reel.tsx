import { useEvent } from 'expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text as RNText, View } from 'react-native';
import { momentAt, momentsIn, type Moment } from '@/game/reel';
import type { Session } from '@/game/types';
import { useDatabase } from '@/hooks/useDatabase';
import { useRoundScreenMode } from '@/hooks/useRoundScreenMode';
import { deleteClips, listClips, type Clip } from '@/media/reels';
import { getDeck } from '@/storage/deckRepo';
import { getSession } from '@/storage/sessionRepo';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { EmptyState } from '@/ui/EmptyState';
import { Footer, Screen } from '@/ui/Screen';
import { TopBar } from '@/ui/TopBar';
import { color, font, gutter, palette, radius, space } from '@/ui/tokens';

type Loaded = { session: Session; clips: Clip[]; cardText: Map<string, string> };

/**
 * The highlight reel: every round of a game, played back to back, with what
 * happened stamped over the video as it happens — "Got it: Jaws", "Busted:
 * shark". Clips live on the phone; Share hands one to the share sheet, and
 * Delete clears the night's videos.
 */
export default function ReelScreen() {
  const { session: sessionId } = useLocalSearchParams<{ session: string }>();
  const router = useRouter();
  const database = useDatabase();
  const [loaded, setLoaded] = useState<Loaded | null | 'empty'>(null);
  const [index, setIndex] = useState(0);

  useRoundScreenMode({ landscape: false });

  useEffect(() => {
    if (database.status !== 'ready' || !sessionId) return;
    let cancelled = false;
    const { db } = database;

    void (async () => {
      const session = await getSession(db, sessionId);
      const clips = listClips(sessionId);
      if (!session || clips.length === 0) {
        if (!cancelled) setLoaded('empty');
        return;
      }
      // Play in the order the rounds happened.
      const order = new Map(session.rounds.map((round, i) => [round.id, i]));
      clips.sort((a, b) => (order.get(a.roundId) ?? 0) - (order.get(b.roundId) ?? 0));

      const decks = (await Promise.all(session.deckIds.map((id) => getDeck(db, id)))).flatMap((d) => (d ? [d] : []));
      const cardText = new Map<string, string>();
      for (const deck of decks) for (const card of deck.cards) cardText.set(`${deck.id}/${card.id}`, card.text);
      if (!cancelled) setLoaded({ session, clips, cardText });
    })();

    return () => {
      cancelled = true;
    };
  }, [database, sessionId]);

  if (loaded === null) return <Screen>{null}</Screen>;
  if (loaded === 'empty') {
    return (
      <Screen>
        <TopBar leading="close" onLeading={router.back} title="Highlights" />
        <EmptyState title="No videos for this game" body="Turn on “Film the room” in Settings and the next game records itself." />
      </Screen>
    );
  }

  const clip = loaded.clips[Math.min(index, loaded.clips.length - 1)]!;
  const round = loaded.session.rounds.find((r) => r.id === clip.roundId);
  const team = loaded.session.teams.find((t) => t.id === round?.teamId);
  const title = [round?.playerName, loaded.session.teams.length > 1 ? team?.name : null].filter(Boolean).join(' · ') || `Round ${index + 1}`;

  const share = async () => {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(clip.uri, { mimeType: 'video/quicktime', UTI: 'com.apple.quicktime-movie', dialogTitle: 'Share this round' });
    }
  };

  const remove = () =>
    Alert.alert('Delete this game’s videos?', 'They’re only on this phone, so they’ll be gone for good.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteClips(loaded.session.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <TopBar leading="close" onLeading={router.back} title="Highlights" />
      <ClipPlayer
        key={clip.uri}
        clip={clip}
        moments={round ? momentsIn(round, clip.startRoundMs) : []}
        cardText={loaded.cardText}
        onEnd={() => setIndex((i) => (i + 1 < loaded.clips.length ? i + 1 : i))}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rounds}>
        {loaded.clips.map((c, i) => (
          <Chip key={c.uri} label={`Round ${i + 1}`} selected={i === index} onPress={() => setIndex(i)} />
        ))}
      </ScrollView>
      <RNText style={styles.who} numberOfLines={1}>
        {title}
      </RNText>
      <Footer>
        <Button label="Share this round" variant="primary" size="lg" icon="share" onPress={() => void share()} />
        <Button label="Delete this game’s videos" variant="ghost" onPress={remove} />
      </Footer>
    </Screen>
  );
}

function ClipPlayer({
  clip,
  moments,
  cardText,
  onEnd,
}: {
  clip: Clip;
  moments: Moment[];
  cardText: Map<string, string>;
  onEnd: () => void;
}) {
  const player = useVideoPlayer(clip.uri, (p) => {
    p.timeUpdateEventInterval = 0.2;
    p.play();
  });
  const time = useEvent(player, 'timeUpdate', { currentTime: 0, currentLiveTimestamp: null, currentOffsetFromLive: null, bufferedPosition: 0 });

  useEffect(() => {
    const subscription = player.addListener('playToEnd', onEnd);
    return () => subscription.remove();
  }, [onEnd, player]);

  const moment = useMemo(() => momentAt(moments, (time?.currentTime ?? 0) * 1000), [moments, time]);
  const text = moment ? (cardText.get(moment.cardId) ?? 'a card') : null;

  return (
    <View style={styles.player}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      {moment && text ? (
        <View
          style={[
            styles.sticker,
            { backgroundColor: moment.outcome === 'correct' ? palette.green : moment.busted ? palette.red : palette.orange },
          ]}
        >
          <RNText style={styles.stickerText} numberOfLines={1}>
            {moment.outcome === 'correct' ? `🔥 Got it: ${text}` : moment.busted ? `🚨 Busted: “${moment.busted}”` : `💨 Pass: ${text}`}
          </RNText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  player: {
    flex: 1,
    marginHorizontal: gutter,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: color.ink,
  },
  sticker: {
    position: 'absolute',
    top: space.lg,
    alignSelf: 'center',
    maxWidth: '90%',
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: radius.pill,
    transform: [{ rotate: '-3deg' }],
  },
  stickerText: { fontFamily: font.display, fontSize: 22, lineHeight: 28, color: color.ink },
  rounds: { gap: space.sm, paddingHorizontal: gutter, paddingTop: space.md },
  who: { fontFamily: font.heavy, fontSize: 15, lineHeight: 20, color: color.textMuted, paddingHorizontal: gutter, paddingTop: space.sm },
});
