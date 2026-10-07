import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { color, radius, space, type as typeScale } from './tokens';

export type FieldProps = TextInputProps & {
  size?: 'body' | 'heading';
};

/**
 * A text input. Soft grey at rest, white with a blue edge when focused, so it
 * is always obvious which box the keyboard is typing into.
 */
export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { size = 'body', style, onFocus, onBlur, multiline, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      ref={ref}
      placeholderTextColor={color.textFaint}
      multiline={multiline}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        styles.input,
        size === 'heading' ? typeScale.heading : typeScale.body,
        multiline && styles.multiline,
        focused && styles.focused,
        style,
      ]}
      {...rest}
    />
  );
});

const styles = StyleSheet.create({
  input: {
    color: color.text,
    backgroundColor: color.backgroundSoft,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: color.line,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 4,
  },
  multiline: {
    textAlignVertical: 'top',
    paddingTop: space.sm + 4,
  },
  focused: {
    borderColor: color.focus,
    backgroundColor: color.background,
  },
});
