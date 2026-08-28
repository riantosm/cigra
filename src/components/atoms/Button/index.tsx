import { forwardRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { MotiView } from 'moti';

import { colors } from '@/theme/colors';
import { pressTransition } from '@/utils/motion';

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
  const {
    label,
    variant = 'primary',
    loading = false,
    disabled = false,
    style,
    onPressIn,
    onPressOut,
    ...rest
  } = props;
  const [pressed, setPressed] = useState(false);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      ref={ref}
      disabled={isDisabled}
      onPressIn={event => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={event => {
        setPressed(false);
        onPressOut?.(event);
      }}
      style={style}
      {...rest}>
      <MotiView
        animate={{ scale: pressed ? 0.96 : 1 }}
        transition={pressTransition}
        style={[styles.container, containerVariantStyle[variant], isDisabled && styles.disabled]}>
        {loading ? (
          <ActivityIndicator color={indicatorColorByVariant[variant]} />
        ) : (
          <Text style={[styles.label, { color: labelVariantColor[variant] }]}>{label}</Text>
        )}
      </MotiView>
    </Pressable>
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
