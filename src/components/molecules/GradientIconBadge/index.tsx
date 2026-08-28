import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';

export interface GradientIconBadgeProps {
  icon: IconName;
  gradientStart: string;
  gradientEnd: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export default function GradientIconBadge(props: GradientIconBadgeProps) {
  const { icon, gradientStart, gradientEnd, size = 56, style } = props;
  const gradientId = `${gradientStart}-${gradientEnd}`;

  return (
    <View style={[{ height: size, width: size }, styles.container, style]}>
      <Svg style={StyleSheet.absoluteFill} width={size} height={size}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradientStart} />
            <Stop offset="1" stopColor={gradientEnd} />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} rx={size * 0.28} fill={`url(#${gradientId})`} />
      </Svg>
      <Icon name={icon} size={size * 0.46} color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
