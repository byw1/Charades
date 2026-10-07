import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { cardTextOn } from './contrast';
import { Text } from './Text';
import { color, font, palette, radius, space } from './tokens';

/**
 * The messaging-app vocabulary: a chat line with a coloured sender label, a
 * caption bar laid over a full-bleed screen, a tilted sticker, an avatar.
 * Borrowed because the people playing already read it without thinking.
 */

export type ChatLineProps = {
  /** Who is talking. Shown as a small coloured label above the message. */
  from?: string;
  tint?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** A message: sender in caps and colour, a bar of the same colour down the left. */
export function ChatLine({ from = 'DEX', tint = palette.purple, children, style }: ChatLineProps) {
  return (
    <View style={[styles.chat, style]}>
      <Text variant="overline" style={{ color: tint }}>
        {from.toUpperCase()}
      </Text>
      <View style={[styles.chatBody, { borderLeftColor: tint }]}>
        {typeof children === 'string' ? <Text variant="heading">{children}</Text> : children}
      </View>
    </View>
  );
}

/** A full-width translucent bar of centred white text, laid over a picture. */
export function Caption({ children, size = 'md' }: { children: string; size?: 'md' | 'lg' }) {
  return (
    <View style={styles.caption}>
      <Text style={[styles.captionText, size === 'lg' && styles.captionLarge]} align="center">
        {children}
      </Text>
    </View>
  );
}

/** A small tilted label, like a sticker slapped on the screen. */
export function Sticker({
  children,
  tint = color.bone,
  tilt = -6,
  style,
}: {
  children: string;
  tint?: string;
  tilt?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sticker, { backgroundColor: tint, transform: [{ rotate: `${tilt}deg` }] }, style]}>
      <Text style={[styles.stickerText, { color: cardTextOn(tint) }]}>{children}</Text>
    </View>
  );
}

/** A round avatar: a colour, a letter, and an optional emoji badge. */
export function Avatar({
  name,
  tint,
  size = 44,
  badge,
}: {
  name: string;
  tint: string;
  size?: number;
  badge?: string;
}) {
  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: tint }]}>
        <Text style={[styles.avatarText, { color: cardTextOn(tint), fontSize: size * 0.46, lineHeight: size * 0.56 }]}>
          {[...name.trim()][0]?.toUpperCase() ?? '?'}
        </Text>
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={{ fontSize: size * 0.34, lineHeight: size * 0.42 }}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chat: { gap: 4, flexShrink: 1 },
  chatBody: { borderLeftWidth: 3, paddingLeft: space.sm + 2, paddingVertical: 1, gap: 2 },
  caption: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  captionText: { fontFamily: font.bold, fontSize: 18, lineHeight: 24, color: color.bone },
  captionLarge: { fontFamily: font.heavy, fontSize: 24, lineHeight: 30 },
  sticker: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.md - 4,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  stickerText: { fontFamily: font.display, fontSize: 18, lineHeight: 22 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: font.display },
  badge: { position: 'absolute', right: -4, bottom: -4 },
});
