import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';
import { openCoordinatesInMaps } from '@/utils/location';

export interface OpenMapsButtonProps {
  latitude: number;
  longitude: number;
  // true = tombol mengambang (absolute, dekat bawah layar) — dipakai di tab non-Lokasi supaya
  // aksi "buka di maps" tetap gampang dijangkau. false (default) = tombol inline biasa.
  floating?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function OpenMapsButton(props: OpenMapsButtonProps) {
  const { latitude, longitude, floating = false, style } = props;
  const insets = useSafeAreaInsets();

  return (
    <PressableScale
      onPress={() => openCoordinatesInMaps(latitude, longitude)}
      style={[floating ? [styles.floating, { bottom: insets.bottom + 16 }] : styles.inline, style]}
      contentStyle={styles.button}
      accessibilityRole="button"
      accessibilityLabel="Buka di Google Maps">
      <View style={styles.left}>
        <Icon name="send" size={17} color={colors.primaryForeground} />
        <Text style={styles.label}>Buka di Google Maps</Text>
      </View>
      <Icon name="chevron-right" size={18} color={colors.primaryForeground} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  inline: {
    marginTop: 4,
  },
  floating: {
    position: 'absolute',
    left: 24,
    right: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: colors.primary,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
});
