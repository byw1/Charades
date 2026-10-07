import { StyleSheet, View } from 'react-native';
import { Mascot, type MascotMood } from './Mascot';
import { ProgressBar } from './ProgressBar';
import { SpeechBubble } from './SpeechBubble';
import { Text } from './Text';
import { TopBar } from './TopBar';
import { space } from './tokens';

export type StepHeaderProps = {
  step: number;
  of: number;
  title: string;
  subtitle?: string;
  onClose: () => void;
  mood?: MascotMood;
};

/**
 * The header for a step in the new game flow: a close button, a progress bar
 * that fills as you go, and Dex asking the question.
 *
 * Framing each step as a question from a character rather than a form heading
 * is what makes setup feel like part of the game instead of a chore before it.
 */
export function StepHeader({ step, of, title, subtitle, onClose, mood = 'happy' }: StepHeaderProps) {
  return (
    <View>
      <TopBar
        leading="close"
        onLeading={onClose}
        leadingLabel="Leave setup"
        center={
          <View accessibilityLabel={`Step ${step} of ${of}`} accessible>
            <ProgressBar value={step / of} />
          </View>
        }
      />
      <View style={styles.ask}>
        <Mascot size={76} mood={mood} />
        <SpeechBubble>
          <Text variant="heading">{title}</Text>
          {subtitle ? (
            <Text variant="caption" tone="muted">
              {subtitle}
            </Text>
          ) : null}
        </SpeechBubble>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: 20,
    paddingTop: space.sm,
    paddingBottom: space.md,
  },
});
