import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { READABLE_WIDTH, useLayout } from './layout';
import { color, gutter } from './tokens';

export type ScreenProps = {
  children: ReactNode;
  /** Which insets to respect. Round screens opt out entirely to go full bleed. */
  edges?: readonly Edge[];
  style?: ViewStyle;
  /** Canvas colour. Near-black unless a screen is making a moment of it. */
  background?: string;
};

/**
 * Standard menu screen: the dark canvas, safe-area aware.
 *
 * Sideways, the notch and home bar move to the sides, so the side insets are
 * respected too, and the content is held to a readable column in the middle
 * rather than stretched edge to edge.
 */
export function Screen({ children, edges = ['top', 'bottom'], style, background = color.background }: ScreenProps) {
  const { landscape } = useLayout();
  const sides: readonly Edge[] = edges.length > 0 ? [...edges, 'left', 'right'] : edges;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: background }]} edges={sides}>
      <View style={[styles.fill, landscape && edges.length > 0 && styles.column, style]}>{children}</View>
    </SafeAreaView>
  );
}

/**
 * The pinned area at the bottom of a screen that holds its main action.
 * Sideways, there is no height to spare for a stack of full-width buttons, so
 * they sit side by side instead.
 */
export function Footer({ children }: { children: ReactNode }) {
  const { short } = useLayout();
  if (!short) return <View style={styles.footer}>{children}</View>;

  return (
    <View style={[styles.footer, styles.footerRow]}>
      {flatten(children).map((child, index) => (
        <View key={index} style={styles.footerItem}>
          {child}
        </View>
      ))}
    </View>
  );
}

/** The footer's buttons, with fragments opened up so each sits in the row. */
function flatten(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) =>
    isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? flatten(child.props.children) : [child],
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: READABLE_WIDTH, alignSelf: 'center' },
  footer: { paddingHorizontal: gutter, paddingTop: 12, paddingBottom: 8, gap: 10 },
  footerRow: { flexDirection: 'row', paddingTop: 8, paddingBottom: 4 },
  footerItem: { flex: 1 },
});
