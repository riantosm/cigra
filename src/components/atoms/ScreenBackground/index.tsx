import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme/colors';

// Full-bleed backdrop for "canvas theme" screens (DESIGN_SYSTEM.md §5.14, §6): a near-white
// vertical page gradient, rendered absolutely behind the content, never interactive. The
// translucent corner blobs were dropped in the 2026-09-01 near-white revision (invisible on
// the near-white ground). The Auth screens use the richer `atoms/AuthBackground`
// (lavender gradient + blobs + mountains); everything else uses this.
export default function ScreenBackground() {
  const { width, height } = useWindowDimensions();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="screenPage" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.pageGradientStart} />
            <Stop offset="0.45" stopColor={colors.pageGradientMid} />
            <Stop offset="1" stopColor={colors.pageGradientEnd} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#screenPage)" />
      </Svg>
    </View>
  );
}
