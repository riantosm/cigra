import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme/colors';

export interface ScreenBackgroundProps {
  /** `'default'` shows two translucent corner blobs; `'none'` is a plain gradient. */
  blobs?: 'default' | 'none';
}

// Full-bleed decorative backdrop for "canvas theme" screens (DESIGN_SYSTEM.md §5.14, §6):
// vertical page gradient + a couple of translucent corner blobs. Rendered absolutely behind
// the content, never interactive. The Auth screens use the richer `atoms/AuthBackground`
// (mountains/watermark); everything else uses this.
export default function ScreenBackground(props: ScreenBackgroundProps) {
  const { blobs = 'default' } = props;
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

      {blobs === 'default' ? (
        <>
          <View style={[styles.blob, styles.blobTopRight]} />
          <View style={[styles.blob, styles.blobLeft]} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobTopRight: {
    top: -70,
    right: -80,
    width: 220,
    height: 220,
    backgroundColor: colors.pageBlobStrong,
  },
  blobLeft: {
    top: 140,
    left: -70,
    width: 170,
    height: 170,
    backgroundColor: colors.pageBlobSoft,
  },
});
