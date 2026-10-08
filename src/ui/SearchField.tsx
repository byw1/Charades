import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Icon } from './Icon';
import { color, gutter, radius, scheme, space, type as typeScale } from './tokens';

export type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

export function SearchField({ value, onChangeText, placeholder = 'Search decks and cards' }: SearchFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, focused && styles.focused]}>
      <Icon name="search" size={18} color={focused ? color.text : color.textFaint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.textFaint}
        selectionColor={color.brand}
        keyboardAppearance={scheme}
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: color.surface,
    paddingHorizontal: space.md,
    marginHorizontal: gutter,
  },
  focused: { borderColor: color.line },
  input: { ...typeScale.body, flex: 1, color: color.text, paddingVertical: space.sm + 2 },
});
