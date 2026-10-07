import type { ReactNode } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useHaptics } from '@/hooks/useHaptics';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { color, gutter, radius, space } from './tokens';

/** A small label above a group of controls. */
export function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="overline" tone="faint" style={styles.label}>
      {children.toUpperCase()}
    </Text>
  );
}

/** A rounded block that groups related rows, settings-style. */
export function Group({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

export type SwitchRowProps = {
  icon: IconName;
  tint: string;
  title: string;
  detail?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  last?: boolean;
  /** Greyed out, for a feature this phone or build cannot offer. */
  disabled?: boolean;
};

/** One on/off setting: a coloured icon, a title, a line of why, a switch. */
export function SwitchRow({ icon, tint, title, detail, value, onChange, last = false, disabled = false }: SwitchRowProps) {
  const haptics = useHaptics();

  return (
    <View style={[styles.row, !last && styles.rowDivider, disabled && styles.disabled]}>
      <IconBadge icon={icon} tint={tint} />
      <View style={styles.rowBody}>
        <Text variant="heading">{title}</Text>
        {detail ? (
          <Text variant="caption" tone="muted">
            {detail}
          </Text>
        ) : null}
      </View>
      <Switch
        disabled={disabled}
        value={value}
        onValueChange={(next) => {
          onChange(next);
          haptics.select();
        }}
        trackColor={{ true: color.brand, false: color.surfaceRaised }}
        thumbColor={value ? color.ink : color.bone}
        ios_backgroundColor={color.surfaceRaised}
        accessibilityLabel={title}
      />
    </View>
  );
}

/** A rounded square of colour with an icon in it. */
export function IconBadge({ icon, tint, size = 36 }: { icon: IconName; tint: string; size?: number }) {
  return (
    <View style={[styles.badge, { width: size, height: size, backgroundColor: tint }]} accessible={false}>
      <Icon name={icon} size={size * 0.55} color={color.ink} weight={2.75} />
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.5 },
  label: { paddingHorizontal: gutter, paddingBottom: space.sm },
  group: {
    marginHorizontal: gutter,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md - 4,
    paddingHorizontal: space.md,
    paddingVertical: space.md - 4,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  rowBody: { flex: 1, gap: 2 },
  badge: { borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
