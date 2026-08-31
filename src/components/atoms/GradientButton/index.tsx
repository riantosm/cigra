import { forwardRef } from 'react';
import type { ComponentRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';

export type GradientButtonTone = 'primary' | 'danger';

export interface GradientButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  tone?: GradientButtonTone;
  loading?: boolean;
  /** Pill height. Defaults to `56` (DESIGN_SYSTEM §5.6); StatusModal passes `52` (§5.15). */
  height?: number;
  style?: StyleProp<ViewStyle>;
}

const toneStops: Record<GradientButtonTone, [string, string]> = {
  primary: [colors.gradientPrimaryStart, colors.gradientPrimaryEnd],
  danger: [colors.dangerMuted, colors.danger],
};

const toneShadow: Record<GradientButtonTone, string> = {
  primary: colors.primary,
  danger: colors.danger,
};

// Canvas-theme primary CTA (DESIGN_SYSTEM.md §5.6): pill, gradient fill, blue/red glow shadow,
// 16/700 white label. The plain `Button` atom stays for the not-yet-migrated screens.
const GradientButton = forwardRef<ComponentRef<typeof Pressable>, GradientButtonProps>(
  function GradientButtonImpl(props, ref) {
    const { label, tone = 'primary', loading = false, disabled = false, height, style, ...rest } = props;
    const isDisabled = disabled || loading;
    const [from, to] = toneStops[tone];

    return (
      <PressableScale
        ref={ref}
        scaleTo={0.97}
        disabled={isDisabled}
        style={[{ shadowColor: toneShadow[tone], backgroundColor: to }, styles.shadow, style]}
        contentStyle={[styles.content, height != null && { height }, isDisabled && styles.disabled]}
        {...rest}>
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={`grad-${tone}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={from} />
              <Stop offset="1" stopColor={to} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#grad-${tone})`} />
        </Svg>
        {loading ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
      </PressableScale>
    );
  },
);

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 999,
    // backgroundColor (the gradient's end colour) is set inline per tone so iOS has an opaque
    // shape to cast the shadow from behind the SVG fill.
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  content: {
    height: 56,
    borderRadius: 999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
});

export default GradientButton;
