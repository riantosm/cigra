import { forwardRef } from 'react';
import type { ComponentRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonProps extends PressableProps {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const containerVariantStyle: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.danger },
  ghost: { backgroundColor: 'transparent' },
};

const labelVariantColor: Record<ButtonVariant, string> = {
  primary: colors.primaryForeground,
  secondary: colors.text,
  danger: colors.dangerForeground,
  ghost: colors.primary,
};

const indicatorColorByVariant: Record<ButtonVariant, string> = {
  primary: '#ffffff',
  secondary: colors.textMuted,
  danger: '#ffffff',
  ghost: colors.primary,
};

const Button = forwardRef<ComponentRef<typeof Pressable>, ButtonProps>(function ButtonImpl(
  props,
  ref,
) {
  const { label, variant = 'primary', loading = false, disabled = false, style, ...rest } = props;
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      ref={ref}
      disabled={isDisabled}
      style={style}
      contentStyle={[styles.container, containerVariantStyle[variant], isDisabled && styles.disabled]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={indicatorColorByVariant[variant]} />
      ) : (
        <Text style={[styles.label, { color: labelVariantColor[variant] }]}>{label}</Text>
      )}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Button;
