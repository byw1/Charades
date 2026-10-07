import { Camera } from 'expo-camera';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useHaptics } from '@/hooks/useHaptics';
import { useSettings, useSettingsStore } from '@/hooks/useSettings';
import { allowReminders } from '@/media/reminders';
import { allowVoice, voiceSupported } from '@/media/voice';
import { Chip } from '@/ui/Chip';
import { Icon, type IconName } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Group, IconBadge, SectionLabel, SwitchRow } from '@/ui/Section';
import { Tap } from '@/ui/Tap';
import { Text } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';
import { color, gutter, palette, space } from '@/ui/tokens';

/**
 * App settings, as opposed to the per-game settings in the new game flow.
 *
 * These are preferences about the device and the person holding it, so they
 * persist across games rather than being chosen again every time.
 *
 * There is deliberately no sound toggle yet. Nothing in the app plays audio, so
 * the control would be a switch wired to nothing. It lands with the sound it
 * governs; the stored setting already exists in useSettings for that day.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const settings = useSettings();
  const set = useSettingsStore((s) => s.set);
  const resetAll = useSettingsStore((s) => s.resetAll);

  const [canListen] = useState(() => voiceSupported());

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

  const toggleVoice = async (on: boolean) => {
    if (!on) return set('voiceReferee', false);
    if (await allowVoice()) set('voiceReferee', true);
    else denied('Speech recognition');
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
            <Chip
              grow
              emoji="👆"
              label="Tap"
              detail="Top half got it, bottom half pass"
              selected={settings.inputMode === 'tap'}
              onPress={() => set('inputMode', 'tap')}
              accessibilityLabel="Tap to answer"
            />
            <Chip
              grow
              emoji="🙃"
              label="Tilt"
              detail="Tip down got it, tip up pass"
              selected={settings.inputMode === 'tilt'}
              onPress={() => set('inputMode', 'tilt')}
              accessibilityLabel="Tilt to answer"
            />
          </View>
          {settings.inputMode === 'tilt' ? (
            <Text variant="caption" tone="muted" style={styles.note}>
              Tilt replaces tap for the whole round, so a hand resting on the screen can’t answer for you.
            </Text>
          ) : null}
        </View>

        <View>
          <SectionLabel>During a round</SectionLabel>
          <Group>
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
              icon="bolt"
              tint={palette.blue}
              title="Voice referee"
              detail={
                canListen
                  ? 'Listens during a round: says got it when it hears the answer, and busted when it hears a banned word. Speech is recognised on this iPhone, never online.'
                  : 'Needs the installed app on an iPhone that can recognise speech offline. Not available in Expo Go.'
              }
              value={settings.voiceReferee && canListen}
              onChange={(value) => void toggleVoice(value)}
              disabled={!canListen}
            />
            <SwitchRow
              icon="flame"
              tint={palette.red}
              title="Streak reminders"
              detail="One nudge in the evening when your streak is about to end. Scheduled on this phone; no servers."
              value={settings.streakReminders}
              onChange={(value) => void toggleReminders(value)}
              last
            />
          </Group>
          {settings.voiceReferee && settings.recordRounds && canListen ? (
            <Text variant="caption" tone="muted" style={styles.note}>
              With both on, the referee gets the microphone and round videos are silent.
            </Text>
          ) : null}
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
  colophon: { gap: space.xs, paddingHorizontal: space.xl, paddingTop: space.md },
});
