import { ScrollView, StyleSheet, Text as RNText, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Friend, Rivalry } from '@/game/friends';
import { badges as badgesFor, type PlayStats } from '@/game/stats';
import { CircleButton } from '@/ui/CircleButton';
import { Icon, type IconName } from '@/ui/Icon';
import { READABLE_WIDTH, useLayout } from '@/ui/layout';
import { Mascot } from '@/ui/Mascot';
import { Group, IconBadge, SectionLabel } from '@/ui/Section';
import { Avatar, ChatLine, tintFor } from '@/ui/Social';
import { StatTile } from '@/ui/StatTile';
import { Tap } from '@/ui/Tap';
import { Text } from '@/ui/Text';
import { color, font, gutter, palette, radius, space } from '@/ui/tokens';

export type MePageProps = {
  stats: PlayStats | null;
  friends: Friend[];
  rivalry: Rivalry | null;
  onWrapped: () => void;
  onSettings: () => void;
  onRules: () => void;
  bottomInset: number;
};

/**
 * You. The streak front and centre, then the numbers, then the badges — the
 * things worth screenshotting — and the settings tucked behind a gear.
 */
export function MePage({ stats, friends, rivalry, onWrapped, onSettings, onRules, bottomInset }: MePageProps) {
  const { width, short } = useLayout();
  const insets = useSafeAreaInsets();
  const s = stats ?? { games: 0, rounds: 0, cardsGuessed: 0, bestRound: 0, streak: 0, playedToday: false };
  const list = badgesFor(s);
  const earned = list.filter((b) => b.earned).length;

  const line =
    s.games === 0
      ? 'No games yet. Your first one starts a streak 🔥'
      : s.streak === 0
        ? 'Streak’s at zero. Play today to start a new one.'
        : s.playedToday
          ? `${s.streak} ${s.streak === 1 ? 'day' : 'days'} in a row. Same time tomorrow?`
          : `${s.streak}-day streak ⏳ play today to keep it alive`;

  return (
    <View style={[styles.page, { width, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={[styles.header, short && styles.headerShort]}>
        <Text variant={short ? 'display' : 'hero'} accessibilityRole="header">
          You
        </Text>
        <CircleButton icon="settings" label="Settings" onPress={onSettings} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, short && styles.bodyShort, { paddingBottom: bottomInset + space.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Mascot size={short ? 90 : 120} mood={s.streak > 0 ? 'excited' : 'happy'} poke />
          <View style={styles.streakBlock}>
            <RNText style={styles.streakNumber} allowFontScaling={false}>
              🔥 {s.streak}
            </RNText>
            <Text variant="label" tone="muted">
              day streak
            </Text>
          </View>
        </View>

        <ChatLine style={styles.pad}>{line}</ChatLine>

        {/* Two by two upright; one row of four on a phone on its side. */}
        <View style={[styles.grid, short && styles.row]}>
          <View style={[styles.row, short && styles.grow]}>
            <StatTile label="Cards guessed" value={s.cardsGuessed} tint={palette.yellow} />
            <StatTile label="Best round" value={s.bestRound} tint={palette.green} />
          </View>
          <View style={[styles.row, short && styles.grow]}>
            <StatTile label="Games" value={s.games} tint={palette.pink} />
            <StatTile label="Rounds" value={s.rounds} tint={palette.blue} />
          </View>
        </View>

        {s.games > 0 ? (
          <Tap onPress={onWrapped} squish={0.97} accessibilityLabel="Your night, wrapped. Make a story to share." contentStyle={styles.wrapped}>
            <RNText style={styles.wrappedEmoji}>🎁</RNText>
            <View style={styles.grow}>
              <Text variant="heading" style={styles.wrappedTitle}>
                Tonight, wrapped
              </Text>
              <Text variant="caption" style={styles.wrappedSub}>
                MVP, best round, most-passed card. One image to share.
              </Text>
            </View>
            <Icon name="forward" size={18} color={color.ink} weight={3} />
          </Tap>
        ) : null}

        {friends.length > 0 ? (
          <View>
            <SectionLabel>Friends</SectionLabel>
            <View style={styles.friends}>
              {friends.slice(0, 6).map((friend, index) => (
                <View
                  key={friend.name}
                  style={styles.friend}
                  accessible
                  accessibilityLabel={`${index + 1}. ${friend.name}: ${friend.wins} wins, ${friend.cardsGuessed} cards guessed, ${friend.games} games`}
                >
                  <Text style={styles.rank}>{index + 1}</Text>
                  <Avatar name={friend.name} tint={tintFor(friend.name)} size={38} badge={index === 0 && friend.wins > 0 ? '👑' : undefined} />
                  <View style={styles.grow}>
                    <Text variant="heading" numberOfLines={1}>
                      {friend.name}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {friend.cardsGuessed} cards · best {friend.bestRound} · {friend.games} {friend.games === 1 ? 'game' : 'games'}
                    </Text>
                  </View>
                  <View style={styles.wins}>
                    <RNText style={styles.winsNumber}>{friend.wins}</RNText>
                    <Text variant="caption" tone="muted">
                      {friend.wins === 1 ? 'win' : 'wins'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            {rivalry ? (
              <ChatLine style={[styles.pad, styles.rivalry]}>
                {`⚔️ Biggest rivalry: ${rivalry.a} vs ${rivalry.b}, ${rivalry.aWins}–${rivalry.bWins} across ${rivalry.games} games.`}
              </ChatLine>
            ) : null}
          </View>
        ) : null}

        <View>
          <SectionLabel>{`Badges · ${earned} of ${list.length}`}</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badges}>
            {list.map((badge) => (
              <View
                key={badge.id}
                style={[styles.badge, !badge.earned && styles.locked]}
                accessible
                accessibilityLabel={`${badge.title}, ${badge.earned ? 'earned' : `locked: ${badge.hint}`}`}
              >
                <RNText style={styles.badgeEmoji}>{badge.earned ? badge.emoji : '🔒'}</RNText>
                <Text variant="label" align="center" numberOfLines={1}>
                  {badge.title}
                </Text>
                <Text variant="caption" tone="muted" align="center" numberOfLines={2}>
                  {badge.earned ? 'Unlocked' : badge.hint}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <Group>
          <Row icon="help" tint={palette.blue} title="How to play" onPress={onRules} />
          <Row icon="settings" tint={palette.purple} title="Settings" onPress={onSettings} last />
        </Group>

        <Text variant="caption" tone="faint" align="center" style={styles.pad}>
          Works offline. No accounts, no ads, no tracking. Your stats never leave this phone.
        </Text>
      </ScrollView>
    </View>
  );
}

function Row({
  icon,
  tint,
  title,
  onPress,
  last = false,
}: {
  icon: IconName;
  tint: string;
  title: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Tap onPress={onPress} squish={0.98} accessibilityLabel={title} contentStyle={[styles.navRow, !last && styles.divider]}>
      <IconBadge icon={icon} tint={tint} />
      <Text variant="heading" style={styles.grow}>
        {title}
      </Text>
      <Icon name="forward" size={18} color={color.textFaint} weight={3} />
    </Tap>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    paddingTop: space.sm,
    paddingBottom: space.sm,
  },
  headerShort: { paddingTop: space.xs, paddingBottom: 0 },
  body: { gap: space.lg, paddingTop: space.sm },
  bodyShort: { width: '100%', maxWidth: READABLE_WIDTH, alignSelf: 'center' },
  pad: { paddingHorizontal: gutter },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: gutter },
  streakBlock: { gap: 0 },
  streakNumber: { fontFamily: font.display, fontSize: 56, lineHeight: 62, color: color.text, letterSpacing: -1.5 },
  grid: { gap: 10, paddingHorizontal: gutter },
  row: { flexDirection: 'row', gap: 10 },
  badges: { gap: 10, paddingHorizontal: gutter },
  badge: {
    width: 116,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    paddingVertical: space.md - 2,
    paddingHorizontal: space.sm,
    alignItems: 'center',
    gap: 2,
  },
  locked: { opacity: 0.55 },
  badgeEmoji: { fontSize: 34, lineHeight: 42 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.md, paddingVertical: 12 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  grow: { flex: 1 },
  wrapped: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: gutter,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: palette.yellow,
  },
  wrappedEmoji: { fontSize: 34, lineHeight: 40 },
  wrappedTitle: { color: color.ink },
  wrappedSub: { color: color.ink, opacity: 0.75 },
  friends: { gap: 8, paddingHorizontal: gutter },
  friend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: space.md - 4,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  rank: { fontFamily: font.heavy, fontSize: 14, lineHeight: 18, color: color.textFaint, width: 16, textAlign: 'center' },
  wins: { alignItems: 'center', minWidth: 40 },
  winsNumber: { fontFamily: font.display, fontSize: 26, lineHeight: 30, color: color.text },
  rivalry: { marginTop: space.md },
});
