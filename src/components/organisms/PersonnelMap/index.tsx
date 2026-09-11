import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import type { Region } from 'react-native-maps';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import SecureImage from '@/components/atoms/SecureImage';
import { locationStatusMeta } from '@/components/molecules/LocationStatusBadge';
import { colors } from '@/theme/colors';
import { cardShadowRaised } from '@/theme/shadows';
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

// `react-native-fast-image` (dasar `SecureImage`) kadang tidak berhasil mengirim event
// `onLoad`/`onError` ke JS di bawah New Architecture/bridgeless (`newArchEnabled=true` —
// terlihat sebagai "Unhandled SoftException: getJSModule(RCTEventEmitter)..." di logcat, gambar
// aslinya tetap termuat di layer native tapi JS tidak pernah diberi tahu). Failsafe timeout ini
// memastikan `tracksViewChanges` tetap berhenti walau event itu tak pernah sampai.
const PHOTO_LOAD_FAILSAFE_MS = 4000;

// Satu marker personel — foto asli (`SecureImage`) kalau ada & bisa ditampilkan, jatuh ke inisial
// ber-tone status kalau tidak (juga kalau fotonya gagal dimuat). Tap membuka kartu detail
// mengambang di komponen induk (bukan `Callout` bawaan react-native-maps) — `selected` menyorot
// marker ini dengan warna berbeda selama kartunya terbuka. `tracksViewChanges` aktif hanya sampai
// konten selesai tergambar (foto termuat / gagal, atau langsung untuk fallback inisial) lalu
// dimatikan — react-native-maps menggambar ulang marker custom tiap frame selama flag ini aktif,
// mahal kalau dibiarkan terus.
function SinglePersonnelMarker(props: { item: LocatedPersonnel; selected: boolean; onPress: () => void }) {
  const { item, selected, onPress } = props;
  const hasPhoto = isDisplayablePhoto(item.photo);
  const [ready, setReady] = useState(!hasPhoto);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!hasPhoto || ready) return;
    const timer = setTimeout(() => setReady(true), PHOTO_LOAD_FAILSAFE_MS);
    return () => clearTimeout(timer);
  }, [hasPhoto, ready]);

  const showPhoto = hasPhoto && !failed;
  const ringColor = selected ? colors.primary : locationStatusMeta[item.status].color;

  return (
    <Marker
      coordinate={{ latitude: item.location.latitude, longitude: item.location.longitude }}
      onPress={onPress}
      tracksViewChanges={!ready}
    >
      <View style={[styles.markerRing, styles.singleRing, selected && styles.markerRingSelected, { borderColor: ringColor }]}>
        {showPhoto ? (
          <SecureImage
            path={item.photo}
            style={styles.singlePhoto}
            onLoad={() => setReady(true)}
            onLoadError={() => {
              setFailed(true);
              setReady(true);
            }}
          />
        ) : (
          <View style={[styles.markerFallback, styles.singlePhoto, { backgroundColor: ringColor }]}>
            <Text style={styles.markerInitial}>{(item.full_name.charAt(0) || '?').toUpperCase()}</Text>
          </View>
        )}
      </View>
    </Marker>
  );
}

// Satu sel foto di dalam grid kelompok — foto asli kalau ada & bisa ditampilkan, jatuh ke inisial
// ber-tone status kalau tidak (juga kalau fotonya gagal dimuat). `onDone` hanya dipanggil untuk
// sel yang benar-benar mencoba memuat foto (lihat `photosToLoad` di `ClusterMarker`), dan hanya
// sekali per sel (`firedRef`) supaya event yang telat + failsafe timeout tidak dobel hitung.
function ClusterCell(props: { item: LocatedPersonnel; onDone: () => void }) {
  const { item, onDone } = props;
  const hasPhoto = isDisplayablePhoto(item.photo);
  const [failed, setFailed] = useState(false);
  const firedRef = useRef(false);
  const toneColor = locationStatusMeta[item.status].color;

  function fireOnce() {
    if (firedRef.current) return;
    firedRef.current = true;
    onDone();
  }

  useEffect(() => {
    if (!hasPhoto) return;
    const timer = setTimeout(fireOnce, PHOTO_LOAD_FAILSAFE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPhoto]);

  const showPhoto = hasPhoto && !failed;

  return (
    <View style={[styles.clusterCellRing, { borderColor: toneColor }]}>
      {showPhoto ? (
        <SecureImage
          path={item.photo}
          style={styles.clusterCellPhoto}
          onLoad={fireOnce}
          onLoadError={() => {
            setFailed(true);
            fireOnce();
          }}
        />
      ) : (
        <View style={[styles.markerFallback, styles.clusterCellPhoto, { backgroundColor: toneColor }]}>
          <Text style={styles.clusterCellInitial}>{(item.full_name.charAt(0) || '?').toUpperCase()}</Text>
        </View>
      )}
    </View>
  );
}

// Sel terakhir grid ketika kelompok > 4 orang — menampilkan jumlah sisa (`+N`) alih-alih foto.
function ClusterCountCell(props: { count: number }) {
  return (
    <View style={[styles.clusterCellRing, styles.clusterCountRing]}>
      <Text style={styles.clusterCountText}>+{props.count}</Text>
    </View>
  );
}

type ClusterGridLayout = 'pair' | 'triangle' | 'grid4' | 'gridPlus';

function clusterGridLayout(count: number): ClusterGridLayout {
  if (count <= 2) return 'pair';
  if (count === 3) return 'triangle';
  if (count === 4) return 'grid4';
  return 'gridPlus';
}

// Gabungan beberapa personel yang berdekatan pada zoom saat ini — ditampilkan sebagai grid foto
// (maks. 4 sel): 2 orang → sejajar kiri-kanan, 3 orang → 2 atas + 1 bawah, 4 orang → grid penuh
// 2x2, ≥5 orang → 2 atas + 1 bawah-kiri + sel terakhir "+sisa". Tap membuka kartu mengambang
// (bisa digeser antar personel dalam kelompok ini) di komponen induk, sama seperti marker
// tunggal. Kelompok ini otomatis terpisah lagi jadi marker individual begitu region cukup
// renggang lewat `onRegionChangeComplete` di komponen induk (kalau titiknya benar-benar sama,
// biarkan tetap bersatu — tidak perlu dipaksa terpisah).
function ClusterMarker(props: { cluster: MarkerCluster; selected: boolean; onPress: () => void }) {
  const { cluster, selected, onPress } = props;
  const items = cluster.items;
  const layout = clusterGridLayout(items.length);
  const shown = layout === 'gridPlus' ? items.slice(0, 3) : items.slice(0, 4);
  const remaining = items.length - shown.length;

  const photosToLoad = useMemo(() => shown.filter(item => isDisplayablePhoto(item.photo)).length, [shown]);
  const [loadedCount, setLoadedCount] = useState(0);
  const handleCellDone = () => setLoadedCount(c => c + 1);
  const ready = loadedCount >= photosToLoad;

  return (
    <Marker
      coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
      onPress={onPress}
      tracksViewChanges={!ready}
    >
      <View style={[styles.clusterGrid, selected && styles.clusterGridSelected]}>
        {layout === 'pair' ? (
          <View style={styles.clusterRow}>
            <ClusterCell item={shown[0]} onDone={handleCellDone} />
            <ClusterCell item={shown[1]} onDone={handleCellDone} />
          </View>
        ) : null}
        {layout === 'triangle' ? (
          <>
            <View style={styles.clusterRow}>
              <ClusterCell item={shown[0]} onDone={handleCellDone} />
              <ClusterCell item={shown[1]} onDone={handleCellDone} />
            </View>
            <View style={styles.clusterRow}>
              <ClusterCell item={shown[2]} onDone={handleCellDone} />
            </View>
          </>
        ) : null}
        {layout === 'grid4' ? (
          <>
            <View style={styles.clusterRow}>
              <ClusterCell item={shown[0]} onDone={handleCellDone} />
              <ClusterCell item={shown[1]} onDone={handleCellDone} />
            </View>
            <View style={styles.clusterRow}>
              <ClusterCell item={shown[2]} onDone={handleCellDone} />
              <ClusterCell item={shown[3]} onDone={handleCellDone} />
            </View>
          </>
        ) : null}
        {layout === 'gridPlus' ? (
          <>
            <View style={styles.clusterRow}>
              <ClusterCell item={shown[0]} onDone={handleCellDone} />
              <ClusterCell item={shown[1]} onDone={handleCellDone} />
            </View>
            <View style={styles.clusterRow}>
              <ClusterCell item={shown[2]} onDone={handleCellDone} />
              <ClusterCountCell count={remaining} />
            </View>
          </>
        ) : null}
      </View>
    </Marker>
  );
}

const FLOATING_CARD_WIDTH = 260;

// Satu halaman kartu mengambang — foto/inisial (jatuh ke inisial juga kalau fotonya gagal dimuat)
// + nama + jabatan + ikon panah ke detail personel (kalau `onSelect` diisi).
function FloatingCardPage(props: { item: LocatedPersonnel; onSelect?: (item: LocatedPersonnel) => void }) {
  const { item, onSelect } = props;
  const [failed, setFailed] = useState(false);
  const showPhoto = isDisplayablePhoto(item.photo) && !failed;
  const toneColor = locationStatusMeta[item.status].color;

  return (
    <View style={styles.floatingCard}>
      <View style={[styles.markerRing, styles.floatingAvatarRing, { borderColor: toneColor }]}>
        {showPhoto ? (
          <SecureImage
            path={item.photo}
            style={styles.floatingAvatarPhoto}
            onLoadError={() => setFailed(true)}
          />
        ) : (
          <View style={[styles.markerFallback, styles.floatingAvatarPhoto, { backgroundColor: toneColor }]}>
            <Text style={styles.floatingAvatarInitial}>{(item.full_name.charAt(0) || '?').toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.floatingBody}>
        <Text style={styles.floatingName} numberOfLines={1}>
          {item.full_name}
        </Text>
        <Text style={styles.floatingMeta} numberOfLines={1}>
          {joinFields(item.rank, item.unit)}
        </Text>
      </View>
      {onSelect ? (
        <PressableScale
          onPress={() => onSelect(item)}
          contentStyle={styles.floatingAction}
          accessibilityLabel="Lihat detail personel"
        >
          <Icon name="chevron-right" size={18} color={colors.primaryForeground} />
        </PressableScale>
      ) : null}
    </View>
  );
}

// Kartu detail personel yang mengambang di atas peta saat sebuah marker di-tap — foto/inisial +
// nama + jabatan, dan ikon panah untuk membuka detail personel penuh (kalau `onSelect` diisi).
// Kalau marker yang di-tap adalah kelompok (>1 orang), kartunya jadi bisa digeser (`ScrollView`
// horizontal ber-paging) antar personel dalam kelompok itu, dengan titik indikator halaman.
function PersonnelFloatingCard(props: {
  clusterKey: string;
  items: LocatedPersonnel[];
  onSelect?: (item: LocatedPersonnel) => void;
  onClose: () => void;
}) {
  const { clusterKey, items, onSelect, onClose } = props;
  const [page, setPage] = useState(0);

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / FLOATING_CARD_WIDTH);
    if (next !== page) setPage(next);
  }

  return (
    <View style={styles.floatingWrap}>
    <View style={styles.floatingShell}>
      <PressableScale onPress={onClose} contentStyle={styles.floatingClose} accessibilityLabel="Tutup">
        <Icon name="close" size={14} color={colors.textMuted} />
      </PressableScale>
      <ScrollView
        // `key` me-reset scroll ke halaman pertama tiap kali marker yang dipilih berbeda.
        key={clusterKey}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        style={styles.floatingScroll}
      >
        {items.map(item => (
          <FloatingCardPage key={item.id} item={item} onSelect={onSelect} />
        ))}
      </ScrollView>
      {items.length > 1 ? (
        <View style={styles.floatingDots}>
          {items.map((item, index) => (
            <View key={item.id} style={[styles.floatingDot, index === page && styles.floatingDotActive]} />
          ))}
        </View>
      ) : null}
    </View>
    </View>
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

  // Marker yang sedang dipilih (di-tap) — disorot warna berbeda & membuka kartu mengambang.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selectedCluster = selectedKey ? clusters.find(cluster => cluster.key === selectedKey) ?? null : null;

  return (
    <View style={[styles.container, style]}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        liteMode={liteMode}
        initialRegion={initialRegion}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={interactive}
        pitchEnabled={interactive}
        toolbarEnabled={interactive}
        onPress={() => setSelectedKey(null)}
        onRegionChangeComplete={region => setLatitudeDelta(region.latitudeDelta)}
      >
        {clusters.map(cluster =>
          cluster.items.length === 1 ? (
            <SinglePersonnelMarker
              key={cluster.key}
              item={cluster.items[0]}
              selected={cluster.key === selectedKey}
              onPress={() => setSelectedKey(cluster.key)}
            />
          ) : (
            <ClusterMarker
              key={cluster.key}
              cluster={cluster}
              selected={cluster.key === selectedKey}
              onPress={() => setSelectedKey(cluster.key)}
            />
          ),
        )}
      </MapView>

      {selectedCluster ? (
        <PersonnelFloatingCard
          clusterKey={selectedCluster.key}
          items={selectedCluster.items}
          onSelect={onSelectPersonnel}
          onClose={() => setSelectedKey(null)}
        />
      ) : null}

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
  markerRingSelected: {
    borderWidth: 3,
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
  clusterGrid: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  clusterGridSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  clusterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  clusterCellRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  clusterCellPhoto: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  clusterCellInitial: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  clusterCountRing: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  clusterCountText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.primaryForeground,
  },
  floatingWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: 'center',
  },
  floatingShell: {
    width: FLOATING_CARD_WIDTH,
  },
  floatingClose: {
    position: 'absolute',
    top: -10,
    right: -6,
    zIndex: 1,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  floatingScroll: {
    width: FLOATING_CARD_WIDTH,
    flexGrow: 0,
    borderRadius: 18,
    backgroundColor: colors.floatingSurface,
    ...cardShadowRaised,
  },
  floatingCard: {
    width: FLOATING_CARD_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  floatingAvatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  floatingAvatarPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.neutralSurface,
  },
  floatingAvatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  floatingBody: {
    flex: 1,
    gap: 2,
  },
  floatingName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  floatingMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  floatingAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  floatingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: 8,
  },
  floatingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderSoft,
  },
  floatingDotActive: {
    backgroundColor: colors.primary,
    width: 16,
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
