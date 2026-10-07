import { ScrollView, StyleSheet, Text as RNText, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { badges as badgesFor, type PlayStats } from '@/game/stats';
import { CircleButton } from '@/ui/CircleButton';
import { Icon, type IconName } from '@/ui/Icon';
import { Mascot } from '@/ui/Mascot';
import { Group, IconBadge, SectionLabel } from '@/ui/Section';
import { ChatLine } from '@/ui/Social';
import { StatTile } from '@/ui/StatTile';
import { Tap } from '@/ui/Tap';
import { Text } from '@/ui/Text';
import { color, font, gutter, palette, radius, space } from '@/ui/tokens';

export type MePageProps = {
  stats: PlayStats | null;
  onSettings: () => void;
  onRules: () => void;
  bottomInset: number;
};

/**
 * You. The streak front and centre, then the numbers, then the badges — the
 * things worth screenshotting — and the settings tucked behind a gear.
 */
export function MePage({ stats, onSettings, onRules, bottomInset }: MePageProps) {
  const { width } = useWindowDimensions();
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
    <View style={[styles.page, { width, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="hero" accessibilityRole="header">
          You
        </Text>
        <CircleButton icon="settings" label="Settings" onPress={onSettings} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: bottomInset + space.lg }]} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Mascot size={120} mood={s.streak > 0 ? 'excited' : 'happy'} />
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

        <View style={styles.grid}>
          <View style={styles.row}>
            <StatTile label="Cards guessed" value={s.cardsGuessed} tint={palette.yellow} />
            <StatTile label="Best round" value={s.bestRound} tint={palette.green} />
          </View>
          <View style={styles.row}>
            <StatTile label="Games" value={s.games} tint={palette.pink} />
            <StatTile label="Rounds" value={s.rounds} tint={palette.blue} />
          </View>
        </View>

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
  body: { gap: space.lg, paddingTop: space.sm },
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
});
