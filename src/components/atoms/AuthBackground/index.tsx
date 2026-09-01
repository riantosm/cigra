import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme/colors';

export interface AuthBackgroundProps {
  /** Login-only 3-layer mountain silhouette pinned to the bottom edge. */
  showMountains?: boolean;
}

const MOUNTAIN_HEIGHT = 150;

// Full-bleed decorative backdrop shared by every Auth screen (DESIGN_SYSTEM.md §5.14, §6 "Auth"):
// vertical page gradient + a couple of translucent corner blobs, plus an optional mountain
// silhouette for Login. Rendered absolutely behind the scrollable form, never interactive.
export default function AuthBackground(props: AuthBackgroundProps) {
  const { showMountains = false } = props;
  const { width, height } = useWindowDimensions();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="authPage" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.authGradientStart} />
            <Stop offset="0.45" stopColor={colors.authGradientMid} />
            <Stop offset="1" stopColor={colors.authGradientEnd} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#authPage)" />
      </Svg>

      <View style={[styles.blob, styles.blobTopLeft]} />
      <View style={[styles.blob, styles.blobTopRight]} />

      {showMountains ? (
        <Svg
          width={width}
          height={MOUNTAIN_HEIGHT}
          viewBox="0 0 390 150"
          preserveAspectRatio="none"
          style={styles.mountains}>
          <Path
            d="M0 96 L70 54 L128 92 L190 40 L250 88 L312 52 L390 100 L390 150 L0 150 Z"
            fill={colors.authMountainBack}
          />
          <Path
            d="M0 120 L58 84 L120 116 L188 74 L250 114 L320 82 L390 118 L390 150 L0 150 Z"
            fill={colors.authMountainMid}
          />
          <Path
            d="M0 140 L80 112 L150 136 L230 108 L300 134 L390 112 L390 150 L0 150 Z"
            fill={colors.authMountainFront}
          />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobTopLeft: {
    top: -90,
    left: -70,
    width: 240,
    height: 240,
    backgroundColor: colors.decorBlobStrong,
  },
  blobTopRight: {
    top: 40,
    right: -80,
    width: 200,
    height: 200,
    backgroundColor: colors.decorBlobSoft,
  },
  mountains: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
