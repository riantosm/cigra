import { StyleSheet, Text } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';
import { smallButtonShadow } from '@/theme/shadows';
import { openCoordinatesInMaps } from '@/utils/location';

export interface OpenMapsButtonProps {
  latitude: number;
  longitude: number;
  // true = tombol mengambang (absolute, dekat bawah layar) — dipakai di tab non-Lokasi supaya
  // aksi "buka di maps" tetap gampang dijangkau. false (default) = tombol inline biasa.
  floating?: boolean;
  style?: StyleProp<ViewStyle>;
}

// CTA "Buka di Google Maps" — pill full-rounded, latar putih dengan gradasi tipis, isi (ikon +
// teks `primary`) di tengah (artboard "Catalog Detail - Lokasi").
export default function OpenMapsButton(props: OpenMapsButtonProps) {
  const { latitude, longitude, floating = false, style } = props;
  const insets = useSafeAreaInsets();

  return (
    <PressableScale
      scaleTo={0.97}
      onPress={() => openCoordinatesInMaps(latitude, longitude)}
      style={[
        styles.shadow,
        floating ? [styles.floating, { bottom: insets.bottom + 16 }] : styles.inline,
        style,
      ]}
      contentStyle={styles.button}
      accessibilityRole="button"
      accessibilityLabel="Buka di Google Maps">
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="openMapsGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.surface} />
            <Stop offset="1" stopColor={colors.chipSurface} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#openMapsGrad)" />
      </Svg>
      <Icon name="map-pin" size={17} color={colors.primary} />
      <Text style={styles.label}>Buka di Google Maps</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 999,
    backgroundColor: colors.surface,
    ...smallButtonShadow,
  },
  inline: {
    marginTop: 12,
  },
  floating: {
    position: 'absolute',
    left: 24,
    right: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: 'hidden',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
