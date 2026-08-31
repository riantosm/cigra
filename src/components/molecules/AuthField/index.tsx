import { forwardRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { StyleProp, TextInputProps, TextStyle } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';

export interface AuthFieldProps extends TextInputProps {
  label: string;
  leftIcon: IconName;
  inputStyle?: StyleProp<TextStyle>;
}

// Canvas-theme text field for the Auth screens (DESIGN_SYSTEM.md §5.9): label + white pill-ish
// field with a chip-wrapped left icon and, for password fields, an eye toggle. A read-only field
// (`editable={false}`) renders on the muted neutral surface.
const AuthField = forwardRef<ComponentRef<typeof TextInput>, AuthFieldProps>(
  function AuthFieldImpl(props, ref) {
    const { label, leftIcon, inputStyle, style, secureTextEntry, editable = true, ...rest } = props;
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.field, !editable && styles.fieldDisabled]}>
          <View style={styles.chip}>
            <Icon name={leftIcon} size={16} color={colors.textMuted} />
          </View>
          <TextInput
            ref={ref}
            editable={editable}
            placeholderTextColor={colors.placeholder}
            secureTextEntry={secureTextEntry && !isPasswordVisible}
            style={[styles.input, !editable && styles.inputDisabled, inputStyle, style]}
            {...rest}
          />
          {secureTextEntry ? (
            <PressableScale
              onPress={() => setIsPasswordVisible(visible => !visible)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={isPasswordVisible ? 'Sembunyikan password' : 'Tampilkan password'}>
              <Icon
                name={isPasswordVisible ? 'eye-off' : 'eye'}
                size={20}
                color={colors.placeholder}
              />
            </PressableScale>
          ) : null}
        </View>
      </View>
    );
  },
);

export default AuthField;

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: 8,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    shadowColor: colors.primary,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  fieldDisabled: {
    backgroundColor: colors.neutralSurface,
  },
  chip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.chipSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.heading,
  },
  inputDisabled: {
    color: colors.textMuted,
  },
});
