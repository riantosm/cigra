import { useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import type { Region } from 'react-native-maps';

import Icon from '@/components/atoms/Icon';
import SecureImage from '@/components/atoms/SecureImage';
import { locationStatusMeta } from '@/components/molecules/LocationStatusBadge';
import { colors } from '@/theme/colors';
import type { PersonnelLocationOverviewItem } from '@/types';
import { isDisplayablePhoto } from '@/utils/avatar';
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

type LocatedPersonnel = PersonnelLocationOverviewItem & {
  location: NonNullable<PersonnelLocationOverviewItem['location']>;
};

interface MarkerCluster {
  key: string;
  latitude: number;
  longitude: number;
  items: LocatedPersonnel[];
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

// Radius gabung dalam "derajat lintang setara", diskalakan relatif ke `latitudeDelta` yang
// sedang tampil — makin di-zoom (delta mengecil) makin kecil radiusnya, jadi marker yang
// berdekatan otomatis terpisah lagi begitu region berubah (`onRegionChangeComplete`).
const CLUSTER_RADIUS_FACTOR = 0.06;
const MIN_CLUSTER_RADIUS = 0.0006;

// Pengelompokan greedy sederhana (bukan quad-tree/supercluster) — cukup untuk skala satu
// satuan (puluhan titik). Longitude dikoreksi dengan cos(lat) supaya jarak di dekat garis
// lintang tinggi tidak dianggap lebih jauh dari yang sebenarnya.
function clusterPersonnel(points: LocatedPersonnel[], latitudeDelta: number): MarkerCluster[] {
  const radius = Math.max(Math.abs(latitudeDelta) * CLUSTER_RADIUS_FACTOR, MIN_CLUSTER_RADIUS);
  const clusters: MarkerCluster[] = [];

  points.forEach(item => {
    const lat = item.location.latitude;
    const lng = item.location.longitude;
    const cosLat = Math.cos((lat * Math.PI) / 180);
    const existing = clusters.find(cluster => {
      const dLat = cluster.latitude - lat;
      const dLng = (cluster.longitude - lng) * cosLat;
      return Math.hypot(dLat, dLng) < radius;
    });
    if (existing) {
      const count = existing.items.length;
      existing.latitude = (existing.latitude * count + lat) / (count + 1);
      existing.longitude = (existing.longitude * count + lng) / (count + 1);
      existing.items.push(item);
    } else {
      clusters.push({ key: `cluster-${item.id}`, latitude: lat, longitude: lng, items: [item] });
    }
  });

  return clusters;
}

function clusterBoundsRegion(items: LocatedPersonnel[]): Region {
  const lats = items.map(i => i.location.latitude);
  const lngs = items.map(i => i.location.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const ZOOM_IN_PADDING = 3;
  const MIN_DELTA = 0.004;

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * ZOOM_IN_PADDING, MIN_DELTA),
    longitudeDelta: Math.max((maxLng - minLng) * ZOOM_IN_PADDING, MIN_DELTA),
  };
}

// Satu marker personel — foto asli (`SecureImage`) kalau ada & bisa ditampilkan, jatuh ke inisial
// ber-tone status kalau tidak. `tracksViewChanges` aktif hanya sampai konten selesai tergambar
// (foto termuat / gagal, atau langsung untuk fallback inisial) lalu dimatikan — react-native-maps
// menggambar ulang marker custom tiap frame selama flag ini aktif, mahal kalau dibiarkan terus.
function SinglePersonnelMarker(props: { item: LocatedPersonnel; onSelect?: () => void }) {
  const { item, onSelect } = props;
  const [ready, setReady] = useState(!isDisplayablePhoto(item.photo));
  const toneColor = locationStatusMeta[item.status].color;

  return (
    <Marker
      coordinate={{ latitude: item.location.latitude, longitude: item.location.longitude }}
      tracksViewChanges={!ready}
    >
      <View style={[styles.markerRing, styles.singleRing, { borderColor: toneColor }]}>
        {isDisplayablePhoto(item.photo) ? (
          <SecureImage
            path={item.photo}
            style={styles.singlePhoto}
            onLoad={() => setReady(true)}
            onLoadError={() => setReady(true)}
          />
        ) : (
          <View style={[styles.markerFallback, styles.singlePhoto, { backgroundColor: toneColor }]}>
            <Text style={styles.markerInitial}>{(item.full_name.charAt(0) || '?').toUpperCase()}</Text>
          </View>
        )}
      </View>
      <Callout onPress={onSelect}>
        <View style={styles.callout}>
          <Text style={styles.calloutName}>{item.full_name}</Text>
          <Text style={styles.calloutMeta}>{joinFields(item.rank, item.unit)}</Text>
          {onSelect ? <Text style={styles.calloutAction}>Lihat detail personel</Text> : null}
        </View>
      </Callout>
    </Marker>
  );
}

// Gabungan beberapa personel yang berdekatan pada zoom saat ini — foto orang pertama + badge
// jumlah. Tap untuk zoom ke batas kelompok ini; begitu jaraknya cukup renggang di layar, kelompok
// otomatis terpisah lagi lewat `onRegionChangeComplete` di komponen induk.
function ClusterMarker(props: { cluster: MarkerCluster; onPress: () => void }) {
  const { cluster, onPress } = props;
  const first = cluster.items[0];
  const [ready, setReady] = useState(!isDisplayablePhoto(first.photo));

  return (
    <Marker
      coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
      onPress={onPress}
      tracksViewChanges={!ready}
    >
      <View style={styles.clusterWrap}>
        <View style={[styles.markerRing, styles.clusterRing]}>
          {isDisplayablePhoto(first.photo) ? (
            <SecureImage
              path={first.photo}
              style={styles.clusterPhoto}
              onLoad={() => setReady(true)}
              onLoadError={() => setReady(true)}
            />
          ) : (
            <View style={[styles.markerFallback, styles.clusterPhoto, { backgroundColor: colors.primary }]}>
              <Text style={styles.markerInitial}>{(first.full_name.charAt(0) || '?').toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.clusterBadge}>
          <Text style={styles.clusterBadgeText}>{cluster.items.length}</Text>
        </View>
      </View>
    </Marker>
  );
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
  const mapRef = useRef<MapView>(null);

  const located = useMemo(
    () =>
      personnel.filter(
        (item): item is LocatedPersonnel => item.location !== null,
      ),
    [personnel],
  );

  const initialRegion = useMemo(() => computeRegion(located.map(item => item.location)), [located]);
  const [latitudeDelta, setLatitudeDelta] = useState(initialRegion.latitudeDelta);

  const clusters = useMemo(() => clusterPersonnel(located, latitudeDelta), [located, latitudeDelta]);

  function zoomIntoCluster(cluster: MarkerCluster) {
    mapRef.current?.animateToRegion(clusterBoundsRegion(cluster.items), 350);
  }

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        liteMode={liteMode}
        initialRegion={initialRegion}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={interactive}
        pitchEnabled={interactive}
        toolbarEnabled={interactive}
        onRegionChangeComplete={region => setLatitudeDelta(region.latitudeDelta)}
      >
        {clusters.map(cluster =>
          cluster.items.length === 1 ? (
            <SinglePersonnelMarker
              key={cluster.key}
              item={cluster.items[0]}
              onSelect={onSelectPersonnel ? () => onSelectPersonnel(cluster.items[0]) : undefined}
            />
          ) : (
            <ClusterMarker key={cluster.key} cluster={cluster} onPress={() => zoomIntoCluster(cluster)} />
          ),
        )}
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
  markerRing: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
  singleRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  singlePhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutralSurface,
  },
  markerFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  clusterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderColor: colors.primary,
  },
  clusterPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  clusterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  clusterBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.dangerForeground,
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
