import { Platform, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import type { Region } from 'react-native-maps';

import Icon from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';
import type { PersonnelLocationOverviewItem } from '@/types';
import { joinFields } from '@/utils/format';

export interface PersonnelMapProps {
  personnel: PersonnelLocationOverviewItem[];
  // false = preview kecil (mis. kartu di Home) — nonaktifkan gestur peta supaya tidak rebutan
  // sentuhan dengan ScrollView di sekitarnya. true = halaman peta penuh, gestur aktif normal.
  interactive?: boolean;
  onSelectPersonnel?: (item: PersonnelLocationOverviewItem) => void;
  style?: StyleProp<ViewStyle>;
  // Android lite mode: render peta sebagai bitmap statis, bukan surface GL interaktif. Jauh lebih
  // ringan saat peta ini nempel di dalam ScrollView (mis. kartu pratinjau di CommanderHome) —
  // surface GL yang ikut di-composite tiap frame bikin scroll patah-patah. Hanya untuk preview
  // non-interaktif; di iOS prop-nya diabaikan.
  lite?: boolean;
}

// Jatuh ke pusat Indonesia dengan zoom luas kalau belum ada satu pun titik lokasi yang valid.
const FALLBACK_REGION: Region = {
  latitude: -2.5,
  longitude: 118,
  latitudeDelta: 40,
  longitudeDelta: 40,
};

function computeRegion(
  points: { latitude: number; longitude: number }[],
): Region {
  if (points.length === 0) return FALLBACK_REGION;

  const latitudes = points.map(p => p.latitude);
  const longitudes = points.map(p => p.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  // Padding minimum supaya satu titik tunggal tidak menghasilkan delta nol (zoom tak terhingga).
  const MIN_DELTA = 0.02;
  const PADDING_FACTOR = 1.6;

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * PADDING_FACTOR, MIN_DELTA),
    longitudeDelta: Math.max((maxLng - minLng) * PADDING_FACTOR, MIN_DELTA),
  };
}

export default function PersonnelMap(props: PersonnelMapProps) {
  const {
    personnel,
    interactive = true,
    onSelectPersonnel,
    style,
    lite = false,
  } = props;
  const liteMode = lite && Platform.OS === 'android';
  const located = personnel.filter(
    (
      item,
    ): item is PersonnelLocationOverviewItem & {
      location: NonNullable<PersonnelLocationOverviewItem['location']>;
    } => item.location !== null,
  );

  return (
    <View style={[styles.container, style]}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        liteMode={liteMode}
        initialRegion={computeRegion(located.map(item => item.location))}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={interactive}
        pitchEnabled={interactive}
        toolbarEnabled={interactive}
      >
        {located.map(item => (
          <Marker
            key={item.id}
            coordinate={{
              latitude: item.location.latitude,
              longitude: item.location.longitude,
            }}
          >
            <Callout onPress={() => onSelectPersonnel?.(item)}>
              <View style={styles.callout}>
                <Text style={styles.calloutName}>{item.full_name}</Text>
                <Text style={styles.calloutMeta}>
                  {joinFields(item.rank, item.unit)}
                </Text>
                {onSelectPersonnel ? (
                  <Text style={styles.calloutAction}>
                    Lihat detail personel
                  </Text>
                ) : null}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {interactive && located.length === 0 ? (
        <View
          style={[StyleSheet.absoluteFill, styles.emptyOverlay]}
          pointerEvents="none"
        >
          <Icon name="map-pin" size={28} color={colors.textMuted} />
          <Text style={styles.emptyText}>Belum ada data lokasi personel</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  callout: {
    minWidth: 160,
    gap: 2,
  },
  calloutName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  calloutMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  calloutAction: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.overlay,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.surface,
  },
});
