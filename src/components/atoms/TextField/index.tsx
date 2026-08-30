import { forwardRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  leftIcon?: IconName;
  onClear?: () => void;
}

const TextField = forwardRef<ComponentRef<typeof TextInput>, TextFieldProps>(
  function TextFieldImpl(props, ref) {
    const { label, error, containerStyle, style, secureTextEntry, leftIcon, onClear, value, ...rest } = props;
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const showClearButton = Boolean(onClear) && typeof value === 'string' && value.length > 0;

    return (
      <View style={[styles.container, containerStyle]}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <View style={styles.inputWrapper}>
          {leftIcon ? (
            <View style={styles.leftIcon} pointerEvents="none">
              <Icon name={leftIcon} size={18} color={colors.textMuted} />
            </View>
          ) : null}
          <TextInput
            ref={ref}
            value={value}
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              leftIcon ? styles.inputWithLeftIcon : null,
              secureTextEntry || showClearButton ? styles.inputWithIcon : null,
              error ? styles.inputError : null,
              style,
            ]}
            secureTextEntry={secureTextEntry && !isPasswordVisible}
            {...rest}
          />
          {secureTextEntry ? (
            <PressableScale
              onPress={() => setIsPasswordVisible(visible => !visible)}
              hitSlop={12}
              style={styles.eyeButton}
              accessibilityRole="button"
              accessibilityLabel={isPasswordVisible ? 'Sembunyikan password' : 'Tampilkan password'}>
              <Icon name={isPasswordVisible ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
            </PressableScale>
          ) : showClearButton ? (
            <PressableScale
              onPress={onClear}
              hitSlop={12}
              style={styles.eyeButton}
              accessibilityRole="button"
              accessibilityLabel="Hapus teks">
              <Icon name="close" size={18} color={colors.textMuted} />
            </PressableScale>
          ) : null}
        </View>
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
  inputWrapper: {
    justifyContent: 'center',
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
  inputWithIcon: {
    paddingRight: 48,
  },
  inputWithLeftIcon: {
    paddingLeft: 44,
  },
  leftIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  inputError: {
    borderColor: colors.danger,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
  },
  error: {
    fontSize: 12,
    color: colors.danger,
  },
});

export default TextField;
