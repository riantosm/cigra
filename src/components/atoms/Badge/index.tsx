import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewProps, ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';

export type BadgeVariant = 'success' | 'primary' | 'neutral';

export interface BadgeProps extends ViewProps {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
}

const containerVariantStyle: Record<BadgeVariant, ViewStyle> = {
  success: { backgroundColor: colors.successSurface },
  primary: { backgroundColor: colors.primarySurface },
  neutral: { backgroundColor: colors.neutralSurface },
};

const labelVariantColor: Record<BadgeVariant, string> = {
  success: colors.success,
  primary: colors.primary,
  neutral: colors.textMuted,
};

export default function Badge(props: BadgeProps) {
  const { label, variant = 'neutral', style, ...rest } = props;

  return (
    <View style={[styles.container, containerVariantStyle[variant], style]} {...rest}>
      {variant === 'success' ? <View style={[styles.dot, { backgroundColor: colors.success }]} /> : null}
      <Text style={[styles.label, { color: labelVariantColor[variant] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
