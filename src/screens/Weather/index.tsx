import { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MotiView } from 'moti';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import WeatherIcon from '@/components/atoms/WeatherIcon';
import Card from '@/components/molecules/Card';
import EmptyState from '@/components/molecules/EmptyState';
import WeatherLocationSheet from '@/components/organisms/WeatherLocationSheet';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { regionLabel, useWeather } from '@/hooks/useWeather';
import { colors } from '@/theme/colors';
import type { WeatherPoint } from '@/types';
import { cleanValue, joinFields } from '@/utils/format';
import { contentEnterTransition } from '@/utils/motion';

type Props = RootStackScreenProps<typeof ROUTES.weather>;

// Lebar kartu perkiraan per-3-jam dihitung supaya ~3,5 kartu terlihat sekaligus — potongan kartu
// ke-4 di tepi kanan jadi petunjuk visual bahwa daftarnya bisa digeser horizontal.
const H_CONTENT_PADDING = 20;
const POINT_GAP = 10;
const VISIBLE_POINTS = 3.5;
const POINT_CARD_WIDTH = Math.round(
  (Dimensions.get('window').width - H_CONTENT_PADDING * 2 - POINT_GAP * Math.floor(VISIBLE_POINTS)) /
    VISIBLE_POINTS,
);

function Metric({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Icon name={icon} size={16} color={colors.primary} />
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ForecastPoint({ point }: { point: WeatherPoint }) {
  return (
    <View style={styles.pointCard}>
      <Text style={styles.pointTime}>{point.time_label}</Text>
      <WeatherIcon url={point.icon_url} size={36} />
      <Text style={styles.pointTemp}>
        {point.temp}
        {point.temp_unit}
      </Text>
      <Text style={styles.pointDesc} numberOfLines={2}>
        {point.weather_desc}
      </Text>
    </View>
  );
}

export default function WeatherScreen(props: Props) {
  const { navigation } = props;
  const { weather, isLoading, isRefreshing, error, reload, nearest, manualRegion, setManualRegion } =
    useWeather();
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  const nearestNote =
    !manualRegion && nearest
      ? `Titik terdekat: ${regionLabel(nearest)}${
          typeof nearest.distance_km === 'number' ? ` (±${nearest.distance_km.toFixed(1)} km)` : ''
        }`
      : null;

  const loc = weather?.location;
  const subtitle =
    cleanValue(loc?.formatted_address) ??
    (joinFields(cleanValue(loc?.kecamatan), cleanValue(loc?.kotkab), cleanValue(loc?.provinsi)) ||
      'Prakiraan cuaca BMKG');

  const current = weather?.current;

  return (
    <MainLayout
      title="Prakiraan Cuaca"
      subtitle={manualRegion?.label ?? subtitle}
      variant="canvas"
      onBack={() => navigation.goBack()}
      right={
        <PressableScale
          scaleTo={0.94}
          onPress={() => setIsSheetVisible(true)}
          contentStyle={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Ubah lokasi cuaca">
          <Icon name="map-pin" size={18} color={colors.text} />
        </PressableScale>
      }>
      {isLoading ? (
        <ActivityIndicator style={styles.centerState} color={colors.primary} />
      ) : error && !weather ? (
        <View style={styles.centerWrap}>
          <EmptyState
            icon="sun"
            title="Cuaca tidak tersedia"
            message={error}
          />
          <Text style={styles.retry} onPress={() => reload('refresh')}>
            Coba lagi
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
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
            {current ? (
              <Card style={styles.heroCard}>
                {loc?.source_label ? (
                  <View style={styles.sourcePill}>
                    <Icon name="map-pin" size={12} color={colors.primary} />
                    <Text style={styles.sourceText} numberOfLines={1}>
                      {loc.source_label}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.heroMain}>
                  <WeatherIcon url={current.icon_url} size={76} />
                  <View style={styles.heroTextGroup}>
                    <Text style={styles.heroTemp}>
                      {current.temp}
                      <Text style={styles.heroTempUnit}>{current.temp_unit}</Text>
                    </Text>
                    <Text style={styles.heroDesc}>{current.weather_desc}</Text>
                    <Text style={styles.heroTime}>
                      {joinFields(current.date_label, current.time_label)}
                    </Text>
                  </View>
                </View>
                {nearestNote ? <Text style={styles.nearestNote}>{nearestNote}</Text> : null}
                <View style={styles.metricGrid}>
                  <Metric
                    icon="waves"
                    label="Kelembapan"
                    value={`${current.humidity}${current.humidity_unit}`}
                  />
                  <Metric
                    icon="refresh"
                    label={joinFields('Angin', current.wind_direction) || 'Angin'}
                    value={`${current.wind_speed} ${current.wind_speed_unit}`}
                  />
                  <Metric icon="eye" label="Jarak pandang" value={current.visibility} />
                </View>
              </Card>
            ) : null}

            {(weather?.forecast_days ?? []).map(day => (
              <View key={day.date} style={styles.daySection}>
                <Text style={styles.dayTitle}>
                  {day.day_label}
                  {day.items[0]?.date_label ? (
                    <Text style={styles.dayDate}>  ·  {day.items[0].date_label}</Text>
                  ) : null}
                </Text>
                {day.items.length ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.pointRow}>
                    {day.items.map(point => (
                      <ForecastPoint key={point.datetime} point={point} />
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.dayEmpty}>Belum ada data untuk hari ini.</Text>
                )}
              </View>
            ))}

            <Text style={styles.attribution}>
              {cleanValue(weather?.attribution) ??
                'Data prakiraan cuaca oleh BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)'}
            </Text>
            {cleanValue(weather?.cached_at) ? (
              <Text style={styles.cachedAt}>Diperbarui pada {formatCached(weather!.cached_at!)}</Text>
            ) : null}
          </MotiView>
        </ScrollView>
      )}

      <WeatherLocationSheet
        visible={isSheetVisible}
        onClose={() => setIsSheetVisible(false)}
        manualRegion={manualRegion}
        onUseCurrentLocation={() => setManualRegion(null)}
        onSelectRegion={region => setManualRegion(region)}
      />
    </MainLayout>
  );
}

function formatCached(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: H_CONTENT_PADDING,
    paddingTop: 12,
    paddingBottom: 96,
  },
  headerButton: {
    height: 40,
    width: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chipSurface,
  },
  centerState: {
    marginTop: 40,
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
  heroCard: {
    gap: 16,
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.primarySurface,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  heroMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroTextGroup: {
    flex: 1,
    gap: 2,
  },
  heroTemp: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1,
    color: colors.heading,
  },
  heroTempUnit: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textMuted,
  },
  heroDesc: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  heroTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  nearestNote: {
    fontSize: 11,
    color: colors.placeholder,
  },
  metricGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 14,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  daySection: {
    marginTop: 20,
    gap: 10,
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.heading,
  },
  dayDate: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  dayEmpty: {
    fontSize: 12,
    color: colors.textMuted,
  },
  pointRow: {
    gap: POINT_GAP,
    paddingRight: 8,
  },
  pointCard: {
    width: POINT_CARD_WIDTH,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  pointTime: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  pointTemp: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.heading,
  },
  pointDesc: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
  attribution: {
    marginTop: 24,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  cachedAt: {
    marginTop: 4,
    fontSize: 10,
    color: colors.placeholder,
    textAlign: 'center',
  },
});
