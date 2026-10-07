import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';
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

/** How much room the bar takes, so pages can stop their content above it. */
export function useBottomBarHeight(): number {
  const insets = useSafeAreaInsets();
  return TOP + CONTENT + Math.max(insets.bottom, 10);
}

/**
 * The bar along the bottom of the home pages. Swiping between pages is the
 * main way around; this is the map of where you are and a shortcut to jump.
 * Solid black, so it reads the same under every deck colour.
 */
export function BottomBar({ tabs, active, onSelect }: BottomBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]} accessibilityRole="tablist">
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
            contentStyle={styles.tabInner}
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
  bar: { flexDirection: 'row', paddingTop: TOP, paddingHorizontal: 12, backgroundColor: '#000000' },
  tab: { flex: 1 },
  tabInner: { alignItems: 'center', justifyContent: 'center', gap: 3, height: CONTENT },
  label: { fontFamily: font.bold, fontSize: 11, lineHeight: 14 },
});
