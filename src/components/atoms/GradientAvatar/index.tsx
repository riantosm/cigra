import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme/colors';

export interface GradientAvatarProps {
  /** Usually a single-letter initial. */
  label: string;
  gradientStart: string;
  gradientEnd: string;
  size?: number;
  /** Colour of the small status dot pinned bottom-right; omit for no dot. */
  dotColor?: string;
  style?: StyleProp<ViewStyle>;
}

// Round gradient-filled avatar with an initial (DESIGN_SYSTEM.md §5.8). Uses react-native-svg
// for the fill (no gradient lib installed). The default gradient is the primary blue; callers
// pass the inactive purple (`gradientInactiveStart/End`) or a module identity gradient.
export default function GradientAvatar(props: GradientAvatarProps) {
  const {
    label,
    gradientStart,
    gradientEnd,
    size = 52,
    dotColor,
    style,
  } = props;
  const gradientId = `av-${gradientStart}-${gradientEnd}`.replace(/[^a-zA-Z0-9-]/g, '');

  return (
    <View style={[{ width: size, height: size }, styles.container, style]}>
      <Svg style={StyleSheet.absoluteFill} width={size} height={size}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradientStart} />
            <Stop offset="1" stopColor={gradientEnd} />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} rx={size / 2} fill={`url(#${gradientId})`} />
      </Svg>
      <Text style={[styles.label, { fontSize: size * 0.38 }]}>{label}</Text>
      {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  dot: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: colors.surface,
  },
});
