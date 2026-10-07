import type { ReactNode } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useHaptics } from '@/hooks/useHaptics';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { color, radius, space } from './tokens';

/** A small uppercase label above a group of controls. */
export function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="overline" tone="faint" style={styles.label}>
      {children.toUpperCase()}
    </Text>
  );
}

/** A white card with a soft edge that groups related rows, settings-style. */
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
};

/** One on/off setting: a coloured icon badge, a title, a line of why, a switch. */
export function SwitchRow({ icon, tint, title, detail, value, onChange, last = false }: SwitchRowProps) {
  const haptics = useHaptics();

  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
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
        value={value}
        onValueChange={(next) => {
          onChange(next);
          haptics.select();
        }}
        trackColor={{ true: color.correct, false: color.line }}
        thumbColor={color.background}
        ios_backgroundColor={color.line}
        accessibilityLabel={title}
      />
    </View>
  );
}

/** A rounded square of colour with a white icon in it. */
export function IconBadge({ icon, tint, size = 40 }: { icon: IconName; tint: string; size?: number }) {
  return (
    <View
      style={[styles.badge, { width: size, height: size, backgroundColor: tint }]}
      accessible={false}
    >
      <Icon name={icon} size={size * 0.55} color={color.bone} weight={2.75} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    paddingHorizontal: 20,
    paddingBottom: space.sm,
  },
  group: {
    marginHorizontal: 20,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: color.line,
    backgroundColor: color.background,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md - 2,
  },
  rowDivider: {
    borderBottomWidth: 2,
    borderBottomColor: color.line,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  badge: {
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
