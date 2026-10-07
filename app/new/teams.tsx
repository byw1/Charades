import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { areTeamsReady, MAX_TEAMS, MIN_TEAMS } from '@/game/teams';
import { useNewGameStore } from '@/hooks/useNewGameStore';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { cardTextOn } from '@/ui/contrast';
import { Field } from '@/ui/Field';
import { Footer, Screen } from '@/ui/Screen';
import { SectionLabel } from '@/ui/Section';
import { StepHeader } from '@/ui/StepHeader';
import { Text } from '@/ui/Text';
import { color, font, gutter, radius, space } from '@/ui/tokens';

/**
 * Step two of three: teams, or not.
 *
 * "Just play" comes first and is the default, because plenty of groups do not
 * want teams and making them set some up before playing is the friction that
 * gets an app deleted. It is still a team underneath, so scoring has one path.
 */
export default function NewGameTeamsScreen() {
  const router = useRouter();

  const mode = useNewGameStore((s) => s.mode);
  const teams = useNewGameStore((s) => s.teams);
  const soloPlayers = useNewGameStore((s) => s.soloPlayers);
  const setMode = useNewGameStore((s) => s.setMode);
  const setTeamCount = useNewGameStore((s) => s.setTeamCount);
  const renameTeam = useNewGameStore((s) => s.renameTeam);
  const setTeamPlayers = useNewGameStore((s) => s.setTeamPlayers);
  const setSoloPlayers = useNewGameStore((s) => s.setSoloPlayers);

  const ready = mode === 'justPlay' || areTeamsReady(teams);

  return (
    <Screen>
      <StepHeader
        step={2}
        of={3}
        title="Who’s playing?"
        subtitle="Teams are optional. Names help me pass the phone round."
        onClose={() => router.dismissAll()}
        mood="wink"
      />

      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
          <View style={styles.row}>
            <Chip
              grow
              emoji="🎉"
              label="Just play"
              detail="Everyone together"
              selected={mode === 'justPlay'}
              onPress={() => setMode('justPlay')}
              accessibilityLabel="Just play, no teams"
            />
            <Chip
              grow
              emoji="🏆"
              label="Teams"
              detail="Split up and compete"
              selected={mode === 'teams'}
              onPress={() => setMode('teams')}
            />
          </View>

          {mode === 'justPlay' ? (
            <View style={styles.section}>
              <SectionLabel>Who’s here (optional)</SectionLabel>
              <View style={styles.pad}>
                <PlayerList names={soloPlayers} onChange={setSoloPlayers} />
                <Text variant="caption" tone="muted">
                  One name per line. I’ll rotate who holds the phone and keep everyone’s score.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <SectionLabel>How many teams</SectionLabel>
              <View style={styles.row}>
                {Array.from({ length: MAX_TEAMS - MIN_TEAMS + 1 }, (_, i) => i + MIN_TEAMS)
                  .filter((count) => count >= 2)
                  .map((count) => (
                    <Chip
                      key={count}
                      grow
                      label={String(count)}
                      selected={teams.length === count}
                      onPress={() => setTeamCount(count)}
                      accessibilityLabel={`${count} teams`}
                    />
                  ))}
              </View>

              {teams.map((team) => (
                <View key={team.id} style={[styles.team, { borderColor: team.color }]}>
                  <View style={[styles.teamHeader, { backgroundColor: team.color }]}>
                    <Field
                      value={team.name}
                      onChangeText={(name) => renameTeam(team.id, name)}
                      placeholder="Team name"
                      accessibilityLabel="Team name"
                      maxLength={24}
                      size="heading"
                      style={[styles.teamName, { color: cardTextOn(team.color) }]}
                      placeholderTextColor={cardTextOn(team.color) === color.bone ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)'}
                    />
                  </View>
                  <View style={styles.teamBody}>
                    <PlayerList names={team.playerNames} onChange={(names) => setTeamPlayers(team.id, names)} />
                  </View>
                </View>
              ))}

              {!ready ? (
                <Text variant="caption" tone="pass" style={styles.pad}>
                  Every team needs a name, and no two the same.
                </Text>
              ) : null}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Footer>
        <Button
          label="Next"
          variant="blue"
          size="lg"
          icon={ready ? 'forward' : undefined}
          disabled={!ready}
          onPress={() => router.push('/new/settings')}
        />
      </Footer>
    </Screen>
  );
}

/**
 * Names as free text, one per line.
 *
 * A row of add-a-name fields is more taps and more chrome. People setting this
 * up are usually reading names off a room, and a single box keeps up with them.
 */
function PlayerList({ names, onChange }: { names: string[]; onChange: (names: string[]) => void }) {
  const [draft, setDraft] = useState(names.join('\n'));

  return (
    <Field
      value={draft}
      onChangeText={(text) => {
        setDraft(text);
        onChange(text.split('\n'));
      }}
      placeholder={'Sam\nAlex\nJo'}
      accessibilityLabel="Player names, one per line"
      multiline
      autoCapitalize="words"
      autoCorrect={false}
      style={styles.players}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { paddingTop: space.xs, paddingBottom: space.xl, gap: space.lg },
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: gutter },
  section: { gap: space.md },
  pad: { paddingHorizontal: gutter, gap: space.sm },
  team: {
    marginHorizontal: gutter,
    borderWidth: 2,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: color.surface,
  },
  teamHeader: { padding: space.sm },
  teamName: {
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderColor: 'transparent',
    fontFamily: font.display,
    fontSize: 22,
  },
  teamBody: { padding: space.sm },
  players: { minHeight: 104, backgroundColor: color.background, borderColor: color.background },
});
