import { StyleSheet, View } from 'react-native';
import { Mascot, type MascotMood } from './Mascot';
import { StoryBar } from './ProgressBar';
import { Text } from './Text';
import { TopBar } from './TopBar';
import { gutter, space } from './tokens';

export type StepHeaderProps = {
  step: number;
  of: number;
  title: string;
  subtitle?: string;
  onClose: () => void;
  mood?: MascotMood;
};

/**
 * The header for a step in the new game flow: story segments across the top,
 * a close button, and the question in big type with Dex stuck beside it.
 */
export function StepHeader({ step, of, title, subtitle, onClose, mood = 'happy' }: StepHeaderProps) {
  return (
    <View>
      <TopBar leading="close" onLeading={onClose} leadingLabel="Leave setup" center={<StoryBar count={of} index={step - 1} />} />
      <View style={styles.ask}>
        <View style={styles.copy}>
          <Text variant="display" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" tone="muted">
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.sticker}>
          <Mascot size={64} mood={mood} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: gutter,
    paddingTop: space.xs,
    paddingBottom: space.md,
  },
  copy: { flex: 1, gap: 4 },
  sticker: { transform: [{ rotate: '8deg' }] },
});
