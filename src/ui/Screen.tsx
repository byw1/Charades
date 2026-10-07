import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { color, gutter } from './tokens';

export type ScreenProps = {
  children: ReactNode;
  /** Which insets to respect. Round screens opt out entirely to go full bleed. */
  edges?: readonly Edge[];
  style?: ViewStyle;
  /** Canvas colour. Near-black unless a screen is making a moment of it. */
  background?: string;
};

/** Standard menu screen: the dark canvas, safe-area aware. */
export function Screen({ children, edges = ['top', 'bottom'], style, background = color.background }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: background }]} edges={edges}>
      <View style={[styles.fill, style]}>{children}</View>
    </SafeAreaView>
  );
}

/** The pinned area at the bottom of a screen that holds its main action. */
export function Footer({ children }: { children: ReactNode }) {
  return <View style={styles.footer}>{children}</View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  footer: { paddingHorizontal: gutter, paddingTop: 12, paddingBottom: 8, gap: 10 },
});
