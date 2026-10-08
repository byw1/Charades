import { Camera } from 'expo-camera';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useHaptics } from '@/hooks/useHaptics';
import { type InputMode, useSettings, useSettingsStore } from '@/hooks/useSettings';
import { allowReminders } from '@/media/reminders';
import { Chip } from '@/ui/Chip';
import { Icon, type IconName } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Group, IconBadge, SectionLabel, SwitchRow } from '@/ui/Section';
import { Tap } from '@/ui/Tap';
import { Text } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';
import { color, font, gutter, palette, radius, space, type ThemeChoice } from '@/ui/tokens';

/**
 * App settings, as opposed to the per-game settings in the new game flow.
 *
 * These are preferences about the device and the person holding it, so they
 * persist across games rather than being chosen again every time.
 *
 * Grouped by what they change: how you answer, how the app looks, what you
 * hear and feel, and the optional extras.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const settings = useSettings();
  const set = useSettingsStore((s) => s.set);
  const resetAll = useSettingsStore((s) => s.resetAll);


  const denied = (what: string) =>
    Alert.alert(`${what} is turned off for Deckhead`, 'You can allow it in the Settings app.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => void Linking.openSettings() },
    ]);

  const toggleReminders = async (on: boolean) => {
    if (!on) return set('streakReminders', false);
    if (await allowReminders()) set('streakReminders', true);
    else denied('Notifications');
  };

  const setTheme = useSettingsStore((s) => s.setTheme);
  const switchTheme = (next: ThemeChoice) => {
    if (next === settings.theme) return;
    Alert.alert('Switch the look?', 'Deckhead restarts for a second to repaint. Your game, decks and settings are all kept.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Switch', onPress: () => setTheme(next) },
    ]);
  };

  const toggleRecording = async (on: boolean) => {
    if (!on) return set('recordRounds', false);
    const cameraOk = (await Camera.requestCameraPermissionsAsync()).granted;
    const micOk = cameraOk && (await Camera.requestMicrophonePermissionsAsync()).granted;
    if (cameraOk && micOk) set('recordRounds', true);
    else denied(cameraOk ? 'The microphone' : 'The camera');
  };

  const confirmReset = () => {
    Alert.alert(
      'Reset settings?',
      'Your preferences go back to their defaults. Your decks, games, videos and streak are not touched.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetAll();
            haptics.select();
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <TopBar leading="close" onLeading={router.back} leadingLabel="Close settings" title="Settings" />

      <ScrollView contentContainerStyle={styles.body}>
        <View>
          <SectionLabel>How you answer</SectionLabel>
          <View style={styles.choices}>
            {ANSWER_MODES.map((mode) => (
              <Chip
                key={mode.key}
                grow
                emoji={mode.emoji}
                label={mode.label}
                detail={mode.detail}
                selected={settings.inputMode === mode.key}
                onPress={() => set('inputMode', mode.key)}
                accessibilityLabel={`${mode.label} to answer`}
              />
            ))}
          </View>
          <Text variant="caption" tone="muted" style={styles.note}>
            {ANSWER_MODES.find((mode) => mode.key === settings.inputMode)?.note}
          </Text>
        </View>

        <View>
          <SectionLabel>Look</SectionLabel>
          <View style={styles.choices}>
            {THEME_CHOICES.map((choice) => (
              <Chip
                key={choice.key}
                grow
                emoji={choice.emoji}
                label={choice.label}
                selected={settings.theme === choice.key}
                onPress={() => switchTheme(choice.key)}
                accessibilityLabel={`${choice.label} theme`}
              />
            ))}
          </View>
          <Text variant="caption" tone="muted" style={styles.note}>
            Light is easier to see outside in the sun. Auto follows your phone. Switching restarts Deckhead for a second; nothing is lost.
          </Text>
        </View>

        <View>
          <SectionLabel>Sound and feel</SectionLabel>
          <Group>
            <SwitchRow
              icon="sound"
              tint={palette.orange}
              title="Sound effects"
              detail="A ding for got it, a whoosh for a pass, the countdown and the buzzer."
              value={settings.sound}
              onChange={(value) => set('sound', value)}
            />
            <SwitchRow
              icon="phone"
              tint={palette.purple}
              title="Haptics"
              detail="Buzzes tell the holder what happened."
              value={settings.haptics}
              onChange={(value) => set('haptics', value)}
            />
            <SwitchRow
              icon="sun"
              tint={palette.yellow}
              title="Max brightness"
              detail="So the card reads in a dark room."
              value={settings.boostBrightness}
              onChange={(value) => set('boostBrightness', value)}
              last
            />
          </Group>
        </View>

        <View>
          <SectionLabel>Extras</SectionLabel>
          <Group>
            <SwitchRow
              icon="camera"
              tint={palette.pink}
              title="Film the room"
              detail="The front camera records each round for a highlight reel. Videos stay on this phone unless you share them."
              value={settings.recordRounds}
              onChange={(value) => void toggleRecording(value)}
            />
            <SwitchRow
              icon="flame"
              tint={palette.red}
              title="Streak reminders"
              detail="One nudge in the evening when your streak is about to end. Scheduled on this phone; no servers."
              value={settings.streakReminders}
              onChange={(value) => void toggleReminders(value)}
            />
            <SoonRow
              icon="bolt"
              tint={palette.blue}
              title="Voice referee"
              detail="Hears the answer and calls it, and catches banned words. On its way."
            />
          </Group>
        </View>

        <View>
          <SectionLabel>More</SectionLabel>
          <Group>
            <NavRow icon="help" tint={palette.blue} title="How to play" onPress={() => router.push('/welcome?replay=1')} />
            <NavRow icon="reset" tint={palette.red} title="Reset settings" onPress={confirmReset} last />
          </Group>
        </View>

        <View style={styles.colophon}>
          <Text variant="label" tone="faint" align="center">
            Deckhead {Constants.expoConfig?.version ?? ''}
          </Text>
          <Text variant="caption" tone="faint" align="center">
            Works offline. No accounts, no ads, no tracking.{'\n'}Nothing you make leaves your phone unless you share it.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const ANSWER_MODES: readonly { key: InputMode; emoji: string; label: string; detail: string; note: string }[] = [
  {
    key: 'tilt',
    emoji: '🙃',
    label: 'Tilt',
    detail: 'Tip down got it, up pass',
    note: 'Tilt replaces tap for the whole round, so a hand resting on the screen can’t answer for you. If the motion sensor doesn’t respond, tap takes over by itself.',
  },
  {
    key: 'swipe',
    emoji: '☝️',
    label: 'Swipe',
    detail: 'Up got it, down pass',
    note: 'Swipe anywhere on the screen: up for got it, down to pass. No aiming, and a resting hand won’t count.',
  },
  {
    key: 'tap',
    emoji: '👆',
    label: 'Tap',
    detail: 'Top got it, bottom pass',
    note: 'The top half of the screen is got it, the bottom half is pass.',
  },
];

const THEME_CHOICES: readonly { key: ThemeChoice; emoji: string; label: string }[] = [
  { key: 'dark', emoji: '🌙', label: 'Dark' },
  { key: 'light', emoji: '☀️', label: 'Light' },
  { key: 'system', emoji: '📱', label: 'Auto' },
];

/** A feature that is on its way: shown so people know, but not switchable. */
function SoonRow({ icon, tint, title, detail }: { icon: IconName; tint: string; title: string; detail: string }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${title}, coming soon. ${detail}`}>
      <IconBadge icon={icon} tint={tint} />
      <View style={styles.rowTitle}>
        <Text variant="heading">{title}</Text>
        <Text variant="caption" tone="muted">
          {detail}
        </Text>
      </View>
      <View style={styles.soon}>
        <Text style={styles.soonText}>Coming soon</Text>
      </View>
    </View>
  );
}

function NavRow({
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
    <Tap onPress={onPress} squish={0.98} accessibilityLabel={title} contentStyle={[styles.row, !last && styles.rowDivider]}>
      <IconBadge icon={icon} tint={tint} />
      <Text variant="heading" style={styles.rowTitle}>
        {title}
      </Text>
      <Icon name="forward" size={18} color={color.textFaint} weight={3} />
    </Tap>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: space.sm, paddingBottom: space.xl, gap: space.lg },
  choices: { flexDirection: 'row', gap: 10, paddingHorizontal: gutter },
  note: { paddingHorizontal: gutter, paddingTop: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.md, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  rowTitle: { flex: 1 },
  soon: { backgroundColor: color.surfaceRaised, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  soonText: { fontFamily: font.heavy, fontSize: 11, lineHeight: 14, color: color.textMuted },
  colophon: { gap: space.xs, paddingHorizontal: space.xl, paddingTop: space.md },
});
