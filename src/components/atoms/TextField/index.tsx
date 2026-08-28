import { forwardRef } from 'react';
import type { ComponentRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

const TextField = forwardRef<ComponentRef<typeof TextInput>, TextFieldProps>(
  function TextFieldImpl(props, ref) {
    const { label, error, containerStyle, style, ...rest } = props;

    return (
      <View style={[styles.container, containerStyle]}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, error ? styles.inputError : null, style]}
          {...rest}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  input: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    fontSize: 12,
    color: colors.danger,
  },
});

export default TextField;
