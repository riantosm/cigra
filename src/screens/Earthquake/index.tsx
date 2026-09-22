import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MotiView } from 'moti';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import Badge from '@/components/atoms/Badge';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import EmptyState from '@/components/molecules/EmptyState';
import InfoRow from '@/components/molecules/InfoRow';
import SectionCard from '@/components/molecules/SectionCard';
import SegmentedControl from '@/components/molecules/SegmentedControl';
import MainLayout from '@/components/templates/MainLayout';
import { useEarthquake } from '@/hooks/useEarthquake';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  getFeltEarthquakesApi,
  getRecentEarthquakesApi,
} from '@/services/api/earthquake.service';
import { colors } from '@/theme/colors';
import type { EarthquakeItem } from '@/types';
import { earthquakeMeta, formatMagnitude } from '@/utils/earthquake';
import { extractErrorMessage, joinFields, orDash } from '@/utils/format';
import { gradientForColor } from '@/utils/gradientColor';
import { contentEnterTransition } from '@/utils/motion';
import { openCoordinatesInMaps } from '@/utils/location';

// Latar gradient di belakang badge magnitudo (pill kecil di kartu list, kotak besar di hero) —
// "Aksen Gradient" (DESIGN_SYSTEM.md §5.13b), samakan dengan `organisms/EarthquakeWidget`.
function MagGradientFill(props: { colors: readonly [string, string]; radius: number }) {
  const [from, to] = props.colors;
  const gradientId = `eqDetailMag-${from}-${to}`.replace(/[^a-zA-Z0-9-]/g, '');
  return (
    <Svg style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" rx={props.radius} fill={`url(#${gradientId})`} />
    </Svg>
  );
}

type Props = RootStackScreenProps<typeof ROUTES.earthquake>;

type Tab = 'latest' | 'recent' | 'felt';

const TABS = [
  { value: 'latest' as const, label: 'Terkini' },
  { value: 'recent' as const, label: 'M 5.0+' },
  { value: 'felt' as const, label: 'Dirasakan' },
];

function QuakeCard({ item }: { item: EarthquakeItem }) {
  const meta = earthquakeMeta(item.magnitude, item.is_tsunami_potential);
  return (
    <Card style={[styles.quakeCard, { borderColor: meta.border }]}>
      <View style={styles.quakeHead}>
        <View style={styles.magPill}>
          <MagGradientFill colors={gradientForColor(meta.accent)} radius={8} />
          <Text style={styles.magPillText}>{formatMagnitude(item.magnitude)}</Text>
        </View>
        <Text style={styles.quakeTime} numberOfLines={1}>
          {joinFields(item.tanggal, item.jam)}
        </Text>
      </View>
      <Text style={styles.quakeWilayah}>{item.wilayah}</Text>
      <Text style={styles.quakeMeta} numberOfLines={2}>
        {joinFields(`Kedalaman ${item.kedalaman}`, item.dirasakan ?? undefined, item.potensi)}
      </Text>
    </Card>
  );
}

function ListTab({
  load,
  emptyMessage,
}: {
  load: () => Promise<EarthquakeItem[]>;
  emptyMessage: string;
}) {
  const [items, setItems] = useState<EarthquakeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'refresh') setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);
      try {
        setItems(await load());
      } catch (err) {
        setError(extractErrorMessage(err, 'Gagal memuat data gempa.'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [load],
  );

  useEffect(() => {
    run('initial');
  }, [run]);

  if (isLoading) return <ActivityIndicator style={styles.centerState} color={colors.primary} />;
  if (error && items.length === 0) return <Text style={styles.centerState}>{error}</Text>;

  return (
    <ScrollView
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => run('refresh')}
          tintColor={colors.primary}
        />
      }>
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={contentEnterTransition}>
        {items.length === 0 ? (
          <EmptyState icon="globe" title="Belum ada data" message={emptyMessage} style={styles.empty} />
        ) : (
          items.map((item, index) => <QuakeCard key={`${item.datetime_utc ?? item.jam}-${index}`} item={item} />)
        )}
      </MotiView>
      <Attribution />
    </ScrollView>
  );
}

function Attribution() {
  return (
    <Text style={styles.attribution}>
      Data gempa bumi oleh BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) — InaTEWS
    </Text>
  );
}

export default function EarthquakeScreen(props: Props) {
  const { navigation } = props;
  const { latest, isLoading, isRefreshing, error, reload } = useEarthquake();
  const [tab, setTab] = useState<Tab>('latest');

  const meta = latest ? earthquakeMeta(latest.magnitude, latest.is_tsunami_potential) : null;

  return (
    <MainLayout
      title="Gempa Bumi"
      subtitle="Info gempa BMKG (InaTEWS)"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <View style={styles.tabsWrap}>
        <SegmentedControl<Tab> options={TABS} value={tab} onChange={setTab} />
      </View>

      {tab === 'latest' ? (
        isLoading ? (
          <ActivityIndicator style={styles.centerState} color={colors.primary} />
        ) : error && !latest ? (
          <View style={styles.centerWrap}>
            <EmptyState icon="globe" title="Tidak dapat memuat" message={error} />
            <Text style={styles.retry} onPress={() => reload('refresh')}>
              Coba lagi
            </Text>
          </View>
        ) : latest && meta ? (
          <ScrollView
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => reload('refresh')}
                tintColor={colors.primary}
              />
            }>
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={contentEnterTransition}>
              <Card style={[styles.hero, { borderColor: meta.border }]}>
                <View style={styles.heroTop}>
                  <View style={styles.heroMag}>
                    <MagGradientFill colors={gradientForColor(meta.accent)} radius={18} />
                    <Text style={styles.heroMagValue}>{latest.magnitude.toFixed(1)}</Text>
                    <Text style={styles.heroMagUnit}>Magnitudo</Text>
                  </View>
                  <View style={styles.heroText}>
                    <Badge label={latest.level_label || meta.label} variant={meta.badgeVariant} />
                    <Text style={styles.heroWilayah}>{latest.wilayah}</Text>
                    <Text style={styles.heroTime}>
                      {joinFields(latest.formatted_date, latest.formatted_time)}
                    </Text>
                  </View>
                </View>

                {latest.is_tsunami_potential ? (
                  <View style={styles.tsunamiBanner}>
                    <Icon name="alert-triangle" size={16} color={colors.dangerText} />
                    <Text style={styles.tsunamiBannerText}>{latest.potensi}</Text>
                  </View>
                ) : null}
              </Card>

              <SectionCard icon="globe" title="Detail Gempa">
                <InfoRow icon="map-pin" label="Wilayah" value={orDash(latest.wilayah)} />
                <InfoRow
                  icon="crosshair"
                  label="Koordinat"
                  value={joinFields(latest.lintang, latest.bujur) || orDash(latest.coordinates)}
                />
                <InfoRow icon="bar-chart" label="Kedalaman" value={orDash(latest.kedalaman)} />
                <InfoRow icon="info" label="Potensi" value={orDash(latest.potensi)} />
                <InfoRow icon="users" label="Dirasakan" value={orDash(latest.dirasakan)} />
              </SectionCard>

              {typeof latest.latitude === 'number' && typeof latest.longitude === 'number' ? (
                <PressableScale
                  scaleTo={0.98}
                  onPress={() => openCoordinatesInMaps(latest.latitude!, latest.longitude!)}
                  contentStyle={styles.mapsBtn}>
                  <Icon name="map-pin" size={15} color={colors.primary} />
                  <Text style={styles.mapsBtnText}>Buka lokasi di Google Maps</Text>
                </PressableScale>
              ) : null}

              {latest.shakemap_image ? (
                <View style={styles.shakemapWrap}>
                  <Text style={styles.shakemapLabel}>PETA GUNCANGAN (SHAKEMAP)</Text>
                  <Image
                    source={{ uri: latest.shakemap_image }}
                    style={styles.shakemap}
                    resizeMode="contain"
                  />
                  <PressableScale
                    scaleTo={0.98}
                    onPress={() => Linking.openURL(latest.shakemap_image!).catch(() => {})}
                    contentStyle={styles.shakemapLink}>
                    <Icon name="info" size={13} color={colors.primary} />
                    <Text style={styles.mapsBtnText}>Buka gambar resmi BMKG</Text>
                  </PressableScale>
                </View>
              ) : null}

              <Attribution />
            </MotiView>
          </ScrollView>
        ) : null
      ) : tab === 'recent' ? (
        <ListTab load={() => getRecentEarthquakesApi()} emptyMessage="Belum ada gempa M 5.0+ terbaru." />
      ) : (
        <ListTab load={() => getFeltEarthquakesApi()} emptyMessage="Belum ada gempa dirasakan terbaru." />
      )}
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  tabsWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 96,
  },
  centerState: {
    marginTop: 40,
    textAlign: 'center',
    fontSize: 13,
    color: colors.textMuted,
  },
  centerWrap: {
    marginTop: 48,
    alignItems: 'center',
    gap: 12,
  },
  retry: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    padding: 8,
  },
  empty: {
    marginTop: 40,
  },
  hero: {
    gap: 14,
  },
  heroTop: {
    flexDirection: 'row',
    gap: 14,
  },
  heroMag: {
    width: 84,
    height: 84,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroMagValue: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
    color: colors.primaryForeground,
  },
  heroMagUnit: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: -2,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  heroWilayah: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.heading,
  },
  heroTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  tsunamiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.dangerSurface,
  },
  tsunamiBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.dangerText,
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primarySurface,
  },
  mapsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  shakemapWrap: {
    marginTop: 16,
    gap: 8,
  },
  shakemapLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.textMuted,
  },
  shakemap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: colors.neutralSurface,
  },
  shakemapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.primarySurface,
  },
  quakeCard: {
    marginBottom: 12,
    gap: 6,
  },
  quakeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  magPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  magPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryForeground,
  },
  quakeTime: {
    flex: 1,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
  },
  quakeWilayah: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.heading,
  },
  quakeMeta: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
  },
  attribution: {
    marginTop: 16,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
