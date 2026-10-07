import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';
import { useLayout } from './layout';
import { Tap } from './Tap';
import { Text } from './Text';
import { color, font } from './tokens';

export type BottomTab = { key: string; label: string; icon: IconName };

export type BottomBarProps = {
  tabs: readonly BottomTab[];
  active: number;
  onSelect: (index: number) => void;
};

const TOP = 8;
const CONTENT = 46;
/** Sideways the icon and label sit side by side in a slimmer bar. */
const CONTENT_SHORT = 32;

/** The bar's own inner height and bottom padding for this screen shape. */
function useBarMetrics() {
  const insets = useSafeAreaInsets();
  const { short } = useLayout();
  return {
    short,
    content: short ? CONTENT_SHORT : CONTENT,
    bottom: short ? Math.max(insets.bottom, 4) : Math.max(insets.bottom, 10),
  };
}

/** How much room the bar takes, so pages can stop their content above it. */
export function useBottomBarHeight(): number {
  const { short, content, bottom } = useBarMetrics();
  return (short ? 4 : TOP) + content + bottom;
}

/**
 * The bar along the bottom of the home pages. Swiping between pages is the
 * main way around; this is the map of where you are and a shortcut to jump.
 * Solid black, so it reads the same under every deck colour.
 */
export function BottomBar({ tabs, active, onSelect }: BottomBarProps) {
  const insets = useSafeAreaInsets();
  const { short, content, bottom } = useBarMetrics();

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: bottom, paddingTop: short ? 4 : TOP, paddingLeft: insets.left + 12, paddingRight: insets.right + 12 },
      ]}
      accessibilityRole="tablist"
    >
      {tabs.map((tab, index) => {
        const on = index === active;
        return (
          <Tap
            key={tab.key}
            onPress={() => onSelect(index)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: on }}
            style={styles.tab}
            contentStyle={[styles.tabInner, { height: content }, short && styles.tabInnerShort]}
          >
            <Icon name={tab.icon} size={24} color={on ? color.text : 'rgba(255,255,255,0.5)'} weight={on ? 3 : 2.5} />
            <Text style={[styles.label, { color: on ? color.text : 'rgba(255,255,255,0.5)' }]}>{tab.label}</Text>
          </Tap>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: '#000000' },
  tab: { flex: 1 },
  tabInner: { alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabInnerShort: { flexDirection: 'row', gap: 8 },
  label: { fontFamily: font.bold, fontSize: 11, lineHeight: 14 },
});
