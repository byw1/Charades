import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text as RNText, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EMOJI_GROUPS, lastEmoji, searchEmoji } from '@/decks/emojiCatalog';
import { DEFAULT_DECK_EMOJI } from '@/decks/types';
import { EmojiSticker } from './EmojiSticker';
import { useLayout } from './layout';
import { SearchField } from './SearchField';
import { Text } from './Text';
import { TopBar } from './TopBar';
import { color, font, gutter, radius, scheme, space } from './tokens';

export type EmojiPickerProps = {
  visible: boolean;
  /** The cover now, or null for the default. */
  value: string | null;
  tint: string;
  onPick: (emoji: string | null) => void;
  onClose: () => void;
};

const CELL = 52;

/**
 * Choosing a deck's cover emoji.
 *
 * Two ways in. Type any emoji straight from the keyboard — the whole of
 * iOS's emoji keyboard, with its own search — or search and browse the
 * built-in set by word. Picking one closes the sheet.
 */
export function EmojiPicker({ visible, value, tint, onPick, onClose }: EmojiPickerProps) {
  const [query, setQuery] = useState('');
  const [typed, setTyped] = useState('');
  const { width } = useLayout();

  const pick = (emoji: string | null) => {
    onPick(emoji);
    setQuery('');
    setTyped('');
    onClose();
  };

  const results = query.trim() ? searchEmoji(query) : null;
  const columns = Math.max(5, Math.floor((Math.min(width, 720) - gutter * 2) / CELL));
  const cell = { width: `${100 / columns}%` as const };

  const grid = (list: readonly string[]) => (
    <View style={styles.grid}>
      {list.map((emoji) => (
        <Pressable
          key={emoji}
          onPress={() => pick(emoji)}
          accessibilityRole="button"
          accessibilityLabel={`Use ${emoji}`}
          style={({ pressed }) => [styles.cell, cell, pressed && styles.cellPressed]}
        >
          <View style={[styles.cellInner, emoji === value && { borderColor: tint, backgroundColor: color.surfaceRaised }]}>
            <RNText style={styles.glyph} allowFontScaling={false}>
              {emoji}
            </RNText>
          </View>
        </Pressable>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <SafeAreaView style={styles.sheet} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.column}>
          <TopBar leading="close" onLeading={onClose} leadingLabel="Close" title="Cover emoji" />

          <View style={styles.typeRow}>
            <EmojiSticker emoji={value ?? DEFAULT_DECK_EMOJI} size={64} tilt={-6} />
            <View style={styles.grow}>
              <TextInput
                value={typed}
                onChangeText={(text) => {
                  setTyped(text);
                  const emoji = lastEmoji(text);
                  if (emoji) pick(emoji);
                }}
                placeholder="Type any emoji"
                placeholderTextColor={color.textFaint}
                keyboardAppearance={scheme}
                accessibilityLabel="Type any emoji from your keyboard"
                autoCorrect={false}
                style={styles.typeInput}
              />
              <Text variant="caption" tone="muted">
                Tap here, then 😀 on your keyboard for every emoji there is.
              </Text>
            </View>
          </View>

          <SearchField value={query} onChangeText={setQuery} placeholder="Search: pizza, party, dog…" />

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            {results ? (
              results.length > 0 ? (
                grid(results)
              ) : (
                <Text variant="body" tone="muted" align="center" style={styles.empty}>
                  Nothing for “{query.trim()}”. Try another word, or type it from your keyboard above.
                </Text>
              )
            ) : (
              EMOJI_GROUPS.map((group) => (
                <View key={group.name} style={styles.group}>
                  <Text variant="overline" tone="faint" style={styles.groupName}>
                    {group.name.toUpperCase()}
                  </Text>
                  {grid(group.emoji.map(([emoji]) => emoji))}
                </View>
              ))
            )}

            {value ? (
              <Pressable onPress={() => pick(null)} accessibilityRole="button" style={styles.reset}>
                <Text variant="label" tone="muted" align="center">
                  Use the plain {DEFAULT_DECK_EMOJI} instead
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: color.background },
  column: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center', gap: space.sm },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: gutter, paddingBottom: space.xs },
  grow: { flex: 1, gap: 4 },
  typeInput: {
    fontFamily: font.bold,
    fontSize: 17,
    color: color.text,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  body: { paddingHorizontal: gutter - 4, paddingBottom: space.xl, gap: space.md },
  group: { gap: 4 },
  groupName: { paddingHorizontal: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { aspectRatio: 1, padding: 3 },
  cellPressed: { opacity: 0.6 },
  cellInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  glyph: { fontSize: 30, lineHeight: 38 },
  empty: { paddingVertical: space.xl, paddingHorizontal: space.md },
  reset: { paddingVertical: space.md },
});
