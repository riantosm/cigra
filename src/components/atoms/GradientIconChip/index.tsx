import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';

export interface GradientIconChipProps {
  icon: IconName;
  colors: readonly [string, string];
  size?: number;
  iconSize?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

// Rounded-square icon-chip filled with a 2-tone gradient (react-native-svg — no gradient lib
// installed), white icon on top. Used wherever a flat `${color}1F` tint chip is upgraded to the
// "Aksen Gradient" look (DESIGN_SYSTEM.md — quick actions, activity/announcement rows, notif rows).
export default function GradientIconChip(props: GradientIconChipProps) {
  const { icon, colors: gradientColors, size = 40, iconSize, radius, style } = props;
  const [from, to] = gradientColors;
  const r = radius ?? Math.round(size * 0.3);
  const gradientId = `chip-${from}-${to}`.replace(/[^a-zA-Z0-9-]/g, '');

  return (
    <View style={[{ width: size, height: size, borderRadius: r }, styles.container, style]}>
      <Svg style={StyleSheet.absoluteFill} width={size} height={size}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} rx={r} fill={`url(#${gradientId})`} />
      </Svg>
      <Icon name={icon} size={iconSize ?? Math.round(size * 0.5)} color={colors.primaryForeground} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
