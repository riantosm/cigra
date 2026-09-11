import { useEffect, useMemo, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import type {
  ImageStyle,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import type { Region } from 'react-native-maps';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import LocationStatusBadge, { locationStatusMeta } from '@/components/molecules/LocationStatusBadge';
import { getAuthToken } from '@/services/api/axiosInstance';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme/colors';
import { cardShadowRaised, smallButtonShadow } from '@/theme/shadows';
import type { PersonnelLocationOverviewItem } from '@/types';
import { isDisplayablePhoto, isProtectedApiUrl, resolveSecureFileUrl } from '@/utils/avatar';
import { joinFields } from '@/utils/format';
import { openCoordinatesInMaps } from '@/utils/location';

// `SecureImage` (dasarnya `react-native-fast-image`) ternyata tidak bisa diandalkan khusus untuk
// marker peta ini — logcat device menunjukkan `react-native-fast-image` melempar "Unhandled
// SoftException: getJSModule(RCTEventEmitter)..." di bawah New Architecture (`newArchEnabled=true`
// di proyek ini), dan efeknya bukan cuma event `onLoad` yang tak sampai ke JS: Glide-nya sendiri
// sukses (`onResourceReady`), tapi gambarnya tidak pernah benar-benar ter-commit ke View native —
// hasilnya lingkaran kosong meski fotonya valid. `<Image>` inti RN teruji penuh di Fabric/New
// Architecture, jadi dipakai di sini sebagai pengganti — logika resolve URL + header auth-nya sama
// seperti `SecureImage`, cuma library gambarnya beda.
function MarkerImage(props: {
  path: string | null | undefined;
  style: StyleProp<ImageStyle>;
  onLoad?: () => void;
  onError?: () => void;
}) {
  const { path, style, onLoad, onError } = props;
  const persistedToken = useAppSelector(state => state.auth.token);
  const [token, setToken] = useState<string | null>(persistedToken);

  useEffect(() => {
    let cancelled = false;
    getAuthToken().then(value => {
      if (!cancelled && value) setToken(value);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const uri = resolveSecureFileUrl(path);
  if (!uri) return null;
  const withAuth = Boolean(token) && isProtectedApiUrl(uri);

  return (
    <Image
      style={style}
      source={{ uri, ...(withAuth ? { headers: { Authorization: `Bearer ${token}` } } : null) }}
      onLoad={onLoad}
      onError={onError}
    />
  );
}

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
      // `key` sementara — dihitung ulang di bawah supaya stabil (lihat catatan).
      clusters.push({ key: '', latitude: lat, longitude: lng, items: [item] });
    }
  });

  // `key` dibangun dari SEMUA id anggota (diurutkan), bukan cuma id item pertama yang kebetulan
  // memulai kelompok itu saat iterasi — kalau dipakai id item pertama, key bisa "goyang" antar
  // recompute (mis. gara-gara radius berubah sedikit karena floating-point saat pan/zoom) padahal
  // anggota kelompoknya sama persis, bikin React meng-unmount lalu me-remount ulang marker-nya dan
  // membatalkan state loading foto yang sedang berjalan (marker yang tadinya sudah menampilkan
  // foto tiba-tiba balik kosong lagi). Key yang stabil berarti marker yang sama TETAP sama
  // komponennya selama anggotanya tidak berubah, apa pun urutan iterasi internalnya.
  clusters.forEach(cluster => {
    cluster.key = `cluster-${cluster.items.map(item => item.id).sort((a, b) => a - b).join('-')}`;
  });

  return clusters;
}

// Satu sel foto — foto asli (`MarkerImage`) kalau ada & bisa ditampilkan, jatuh ke inisial
// ber-tone status kalau tidak (juga kalau fotonya gagal/tak kunjung dimuat). Dipakai untuk marker
// satu orang (`size` besar) MAUPUN satu sel di grid kelompok (`size` kecil) — komponennya sengaja
// sama persis untuk keduanya.
//
// `PersonnelGroupMarker` (Marker pembungkusnya) sengaja SELALU `tracksViewChanges={true}` — pernah
// dicoba dimatikan begitu semua foto termuat (demi performa, react-native-maps men-snapshot marker
// custom jadi bitmap statis selama flag ini aktif), tapi ternyata rawan balapan dengan Android:
// bitmap yang sempat "dibekukan" bisa jadi masih dari sebelum foto benar-benar tergambar (marker
// kelihatan kosong walau foto yang sama sukses tampil di kartu mengambang yang bukan snapshot),
// dan re-cluster akibat pan/zoom bisa memicu Google Maps meng-invalidasi bitmap yang sudah benar
// itu lalu tidak pernah memintanya ulang. Untuk jumlah marker di app ini (maks. puluhan), biaya
// snapshot terus-menerus jauh lebih murah daripada risiko marker kosong permanen.
function PhotoCell(props: { item: LocatedPersonnel; size: number; borderWidth: number; ringColor: string }) {
  const { item, size, borderWidth, ringColor } = props;
  const hasPhoto = isDisplayablePhoto(item.photo);
  const [failed, setFailed] = useState(false);
  const sizeStyle = { width: size, height: size, borderRadius: size / 2 };

  const showPhoto = hasPhoto && !failed;

  return (
    <View style={[styles.markerRing, sizeStyle, { borderWidth, borderColor: ringColor }]}>
      {showPhoto ? (
        <MarkerImage path={item.photo} style={sizeStyle} onError={() => setFailed(true)} />
      ) : (
        <View style={[styles.markerFallback, sizeStyle, { backgroundColor: ringColor }]}>
          <Text style={[styles.markerInitial, size < 30 && styles.clusterCellInitial]}>
            {(item.full_name.charAt(0) || '?').toUpperCase()}
          </Text>
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

type ClusterGridLayout = 'single' | 'pair' | 'triangle' | 'grid4' | 'gridPlus';

function clusterGridLayout(count: number): ClusterGridLayout {
  if (count <= 1) return 'single';
  if (count === 2) return 'pair';
  if (count === 3) return 'triangle';
  if (count === 4) return 'grid4';
  return 'gridPlus';
}

// Satu marker personel di peta — ditampilkan sebagai grid foto (maks. 4 sel), sama untuk semua
// ukuran kelompok termasuk 1 orang: 1 orang → satu sel saja, 2 orang → sejajar kiri-kanan, 3 orang
// → 2 atas + 1 bawah, 4 orang → grid penuh 2x2, ≥5 orang → 2 atas + 1 bawah-kiri + sel terakhir
// "+sisa". Tap membuka kartu detail mengambang di komponen induk (bisa digeser antar personel
// kalau kelompoknya >1 orang) — `selected` menyorot marker ini selama kartunya terbuka. Kelompok
// otomatis terpisah lagi jadi marker individual begitu region cukup renggang lewat
// `onRegionChangeComplete` di komponen induk (kalau titiknya benar-benar sama, biarkan tetap
// bersatu — tidak perlu dipaksa terpisah). Lihat catatan `tracksViewChanges` di `PhotoCell` untuk
// kenapa marker ini selalu di-snapshot ulang, tidak dioptimalkan mati setelah foto termuat.
function PersonnelGroupMarker(props: { cluster: MarkerCluster; selected: boolean; onPress: () => void }) {
  const { cluster, selected, onPress } = props;
  const items = cluster.items;
  const layout = clusterGridLayout(items.length);
  const shown = layout === 'gridPlus' ? items.slice(0, 3) : items.slice(0, 4);
  const remaining = items.length - shown.length;

  return (
    <Marker
      coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
      onPress={event => {
        // Android react-native-maps kadang meneruskan tap marker ke `onPress` MapView juga —
        // tanpa ini, tap marker langsung ke-override jadi "tap area kosong" (`setSelectedKey(null)`
        // di komponen induk) di render yang sama, jadi kartu tidak pernah kelihatan muncul.
        event.stopPropagation();
        onPress();
      }}
      tracksViewChanges
    >
      <View style={[styles.clusterGrid, selected && styles.clusterGridSelected]}>
        {layout === 'single' ? (
          <View style={styles.clusterRow}>
            <PhotoCell item={shown[0]} size={20} borderWidth={1.5} ringColor={locationStatusMeta[shown[0].status].color} />
          </View>
        ) : null}
        {layout === 'pair' ? (
          <View style={styles.clusterRow}>
            <PhotoCell item={shown[0]} size={20} borderWidth={1.5} ringColor={locationStatusMeta[shown[0].status].color} />
            <PhotoCell item={shown[1]} size={20} borderWidth={1.5} ringColor={locationStatusMeta[shown[1].status].color} />
          </View>
        ) : null}
        {layout === 'triangle' ? (
          <>
            <View style={styles.clusterRow}>
              <PhotoCell item={shown[0]} size={20} borderWidth={1.5} ringColor={locationStatusMeta[shown[0].status].color} />
              <PhotoCell item={shown[1]} size={20} borderWidth={1.5} ringColor={locationStatusMeta[shown[1].status].color} />
            </View>
            <View style={styles.clusterRow}>
              <PhotoCell item={shown[2]} size={20} borderWidth={1.5} ringColor={locationStatusMeta[shown[2].status].color} />
            </View>
          </>
        ) : null}
        {layout === 'grid4' ? (
          <>
            <View style={styles.clusterRow}>
              <PhotoCell item={shown[0]} size={20} borderWidth={1.5} ringColor={locationStatusMeta[shown[0].status].color} />
              <PhotoCell item={shown[1]} size={20} borderWidth={1.5} ringColor={locationStatusMeta[shown[1].status].color} />
            </View>
            <View style={styles.clusterRow}>
              <PhotoCell item={shown[2]} size={20} borderWidth={1.5} ringColor={locationStatusMeta[shown[2].status].color} />
              <PhotoCell item={shown[3]} size={20} borderWidth={1.5} ringColor={locationStatusMeta[shown[3].status].color} />
            </View>
          </>
        ) : null}
        {layout === 'gridPlus' ? (
          <>
            <View style={styles.clusterRow}>
              <PhotoCell item={shown[0]} size={20} borderWidth={1.5} ringColor={locationStatusMeta[shown[0].status].color} />
              <PhotoCell item={shown[1]} size={20} borderWidth={1.5} ringColor={locationStatusMeta[shown[1].status].color} />
            </View>
            <View style={styles.clusterRow}>
              <PhotoCell item={shown[2]} size={20} borderWidth={1.5} ringColor={locationStatusMeta[shown[2].status].color} />
              <ClusterCountCell count={remaining} />
            </View>
          </>
        ) : null}
      </View>
    </Marker>
  );
}

const FLOATING_CARD_MAX_WIDTH = 250;
const FLOATING_CARD_GAP = 12;
const FLOATING_CARD_SIDE_MARGIN = 28;

// Satu kartu personel di carousel — avatar bulat besar di tengah-atas, nama, jabatan, status
// lokasi, lalu dua tombol (buka lokasi / lihat detail) — meniru pola "kartu profil" umum
// (avatar-nama-subjudul-tombol). Foto jatuh ke inisial ber-tone status kalau tidak ada atau gagal
// dimuat.
function FloatingCardPage(props: {
  item: LocatedPersonnel;
  onSelect?: (item: LocatedPersonnel) => void;
  width: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { item, onSelect, width, style } = props;
  const [failed, setFailed] = useState(false);
  const showPhoto = isDisplayablePhoto(item.photo) && !failed;
  const toneMeta = locationStatusMeta[item.status];

  return (
    <View style={[styles.floatingCard, { width }, style]}>
      <View style={[styles.markerRing, styles.floatingAvatarRing, { borderColor: colors.surface }]}>
        {showPhoto ? (
          <MarkerImage
            path={item.photo}
            style={styles.floatingAvatarPhoto}
            onError={() => setFailed(true)}
          />
        ) : (
          <View style={[styles.markerFallback, styles.floatingAvatarPhoto, { backgroundColor: toneMeta.color }]}>
            <Text style={styles.floatingAvatarInitial}>{(item.full_name.charAt(0) || '?').toUpperCase()}</Text>
          </View>
        )}
      </View>

      <Text style={styles.floatingName} numberOfLines={1}>
        {item.full_name}
      </Text>
      <Text style={styles.floatingMeta} numberOfLines={1}>
        {joinFields(item.rank, item.unit) || 'Personel'}
      </Text>
      <LocationStatusBadge status={item.status} timestamp={item.last_seen} style={styles.floatingStatusBadge} />

      <View style={styles.floatingActions}>
        <PressableScale
          scaleTo={0.97}
          onPress={() => openCoordinatesInMaps(item.location.latitude, item.location.longitude)}
          style={styles.floatingActionFlex}
          contentStyle={styles.floatingSecondaryButton}
        >
          <Icon name="map-pin" size={14} color={colors.primary} />
          <Text style={styles.floatingSecondaryButtonText}>Lokasi</Text>
        </PressableScale>
        {onSelect ? (
          <PressableScale
            scaleTo={0.97}
            onPress={() => onSelect(item)}
            style={styles.floatingActionFlex}
            contentStyle={styles.floatingPrimaryButton}
          >
            <Text style={styles.floatingPrimaryButtonText}>Lihat Detail</Text>
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}

// Carousel kartu detail personel yang mengambang di atas peta saat sebuah marker di-tap — sesuai
// pola "kartu profil" umum (avatar-nama-subjudul-tombol), kartu-kartu bertetangga sedikit
// "mengintip" di tepi layar. Kalau marker yang di-tap adalah kelompok (>1 orang), ada satu kartu
// per personel yang bisa digeser (snap per-kartu) dengan titik indikator halaman; kalau cuma satu
// personel, cuma satu kartu yang tampil (tidak ada dot).
function PersonnelFloatingCard(props: {
  clusterKey: string;
  items: LocatedPersonnel[];
  onSelect?: (item: LocatedPersonnel) => void;
  onClose: () => void;
  containerWidth: number;
}) {
  const { clusterKey, items, onSelect, onClose, containerWidth } = props;
  const [page, setPage] = useState(0);

  const cardWidth = containerWidth > 0
    ? Math.min(FLOATING_CARD_MAX_WIDTH, containerWidth - FLOATING_CARD_SIDE_MARGIN * 2)
    : FLOATING_CARD_MAX_WIDTH;
  const snapInterval = cardWidth + FLOATING_CARD_GAP;
  const sidePadding = Math.max(16, (containerWidth - cardWidth) / 2);

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / snapInterval);
    if (next !== page) setPage(next);
  }

  return (
    <View style={styles.floatingWrap} pointerEvents="box-none">
      <PressableScale
        onPress={onClose}
        style={[styles.floatingCloseWrap, { right: sidePadding - 4 }]}
        contentStyle={styles.floatingClose}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Tutup">
        <Icon name="close" size={15} color={colors.textMuted} />
      </PressableScale>
      <ScrollView
        // `key` me-reset scroll ke halaman pertama tiap kali marker yang dipilih berbeda.
        key={clusterKey}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={items.length > 1 ? snapInterval : undefined}
        decelerationRate="fast"
        disableIntervalMomentum={items.length > 1}
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={[styles.floatingScrollContent, { paddingHorizontal: sidePadding }]}
      >
        {items.map((item, index) => (
          <FloatingCardPage
            key={item.id}
            item={item}
            onSelect={onSelect}
            width={cardWidth}
            style={index < items.length - 1 ? styles.floatingCardSpacing : undefined}
          />
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

  // Lebar kontainer — dipakai kartu mengambang supaya kartu bertetangga "mengintip" di tepi layar.
  const [containerWidth, setContainerWidth] = useState(0);
  function handleContainerLayout(event: LayoutChangeEvent) {
    setContainerWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={[styles.container, style]} onLayout={handleContainerLayout}>
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
        {clusters.map(cluster => (
          <PersonnelGroupMarker
            key={cluster.key}
            cluster={cluster}
            selected={cluster.key === selectedKey}
            onPress={() => setSelectedKey(cluster.key)}
          />
        ))}
      </MapView>

      {selectedCluster ? (
        <PersonnelFloatingCard
          clusterKey={selectedCluster.key}
          items={selectedCluster.items}
          onSelect={onSelectPersonnel}
          onClose={() => setSelectedKey(null)}
          containerWidth={containerWidth}
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
    // Tanpa ini, MapView Android (surface GL) menggambar di atas sibling View manapun terlepas
    // dari urutannya di JSX — kartu jadi ketutup peta walau state-nya benar. `zIndex` di sini
    // memaksa layer ini tampil di atas.
    zIndex: 10,
  },
  floatingCloseWrap: {
    // Posisi & hit-area harus ada di `style` (Pressable luar), bukan `contentStyle` (MotiView
    // dalam) — kalau tidak, lingkaran yang kelihatan ada di posisi absolute itu, tapi area yang
    // benar-benar bisa di-tap tetap di ukuran/posisi asal si Pressable (tidak nyambung dengan
    // lingkarannya), jadi susah/gagal di-tap.
    position: 'absolute',
    top: -14,
    zIndex: 20,
  },
  floatingClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...smallButtonShadow,
  },
  floatingScrollContent: {
    flexDirection: 'row',
  },
  floatingCardSpacing: {
    marginRight: FLOATING_CARD_GAP,
  },
  floatingCard: {
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    paddingTop: 20,
    gap: 4,
    backgroundColor: colors.floatingSurface,
    ...cardShadowRaised,
  },
  floatingAvatarRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    marginBottom: 6,
  },
  floatingAvatarPhoto: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.neutralSurface,
  },
  floatingAvatarInitial: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  floatingName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  floatingMeta: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  floatingStatusBadge: {
    alignSelf: 'center',
    marginTop: 2,
    marginBottom: 10,
  },
  floatingActions: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  // `flex: 1` di sini (Pressable luar), bukan di `contentStyle` — sama seperti kasus tombol X:
  // flex/grow cuma berpengaruh di elemen yang benar-benar jadi flex item baris ini.
  floatingActionFlex: {
    flex: 1,
  },
  floatingSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
    backgroundColor: colors.surface,
  },
  floatingSecondaryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  floatingPrimaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  floatingPrimaryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryForeground,
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
    zIndex: 5,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.surface,
  },
});
