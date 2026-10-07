import { StyleSheet, View } from 'react-native';
import { Mascot, type MascotMood } from './Mascot';
import { Text } from './Text';
import { space } from './tokens';

export type EmptyStateProps = {
  title: string;
  /** What to do next. Empty states are invitations, not apologies. */
  body: string;
  mood?: MascotMood;
};

export function EmptyState({ title, body, mood = 'thinking' }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Mascot size={110} mood={mood} />
      <Text variant="title" align="center">
        {title}
      </Text>
      <Text variant="body" tone="muted" align="center">
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    paddingVertical: space.xl,
    gap: space.sm,
  },
});
