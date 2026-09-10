import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { MotiView } from 'moti';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import WeatherIcon from '@/components/atoms/WeatherIcon';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import type { WeatherForecast } from '@/types';
import { cleanValue, joinFields } from '@/utils/format';
import { contentEnterTransition } from '@/utils/motion';
import { summarizeForecastDay } from '@/utils/weather';

export interface WeatherWidgetProps {
  weather: WeatherForecast | null;
  isLoading: boolean;
  error?: string | null;
  // Ketuk footer "Ketuk untuk detail" → layar Prakiraan Cuaca lengkap.
  onPress?: () => void;
  // Ketuk label lokasi → buka sheet "Ubah Lokasi Cuaca".
  onChangeLocation?: () => void;
  // Label lokasi manual aktif (kalau pengguna sudah memilih), else null = ikut GPS.
  manualLabel?: string | null;
  style?: StyleProp<ViewStyle>;
}

// Widget cuaca di Home (di bawah kartu "Sistem terhubung…"). Bisa di-collapse: default ringkas
// (ikon + suhu + kondisi), diketuk untuk membuka rincian (lokasi, kelembapan/angin/jarak pandang,
// prakiraan 3 hari, tautan ke layar lengkap). Atribusi "BMKG" wajib. Data dari BMKG.
export default function WeatherWidget(props: WeatherWidgetProps) {
  const { weather, isLoading, error, onPress, onChangeLocation, manualLabel, style } = props;
  const current = weather?.current;

  // Default selalu tertutup — dibuka manual per sesi, tidak dipersist.
  const [expanded, setExpanded] = useState(false);

  const placeLabel =
    cleanValue(manualLabel) ??
    (joinFields(
      cleanValue(weather?.location.kecamatan) ?? cleanValue(weather?.location.desa),
      cleanValue(weather?.location.kotkab),
    ) ||
      'Lokasi tidak diketahui');

  const days = (weather?.forecast_days ?? []).slice(0, 3).map(summarizeForecastDay);

  if (!current) {
    return (
      <View style={[styles.card, style]}>
        {isLoading ? (
          <View style={styles.stateRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>Memuat prakiraan cuaca…</Text>
          </View>
        ) : (
          <PressableScale scaleTo={0.98} onPress={onPress} contentStyle={styles.stateRow}>
            <Icon name="sun" size={20} color={colors.textMuted} />
            <View style={styles.stateTextGroup}>
              <Text style={styles.stateText}>{error ?? 'Prakiraan cuaca belum tersedia'}</Text>
              <Text style={styles.stateHint}>Ketuk untuk mencoba lagi</Text>
            </View>
            <Icon name="chevron-right" size={14} color={colors.textMuted} />
          </PressableScale>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.card, style]}>
      <PressableScale
        scaleTo={0.98}
        onPress={() => setExpanded(prev => !prev)}
        contentStyle={styles.headerRow}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Cuaca ${current.weather_desc}, ${current.temp}${current.temp_unit}`}>
        <WeatherIcon url={current.icon_url} size={30} />
        <View style={styles.headerText}>
          <Text style={styles.headerLine} numberOfLines={1}>
            <Text style={styles.headerTemp}>
              {current.temp}
              {current.temp_unit}
            </Text>
            <Text style={styles.headerDesc}>{'  ·  '}{current.weather_desc}</Text>
          </Text>
          {!expanded ? (
            <Text style={styles.headerPlace} numberOfLines={1}>
              {placeLabel}
            </Text>
          ) : null}
        </View>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </PressableScale>

      {expanded ? (
        <MotiView
          from={{ opacity: 0, translateY: -6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={contentEnterTransition}
          style={styles.body}>
          <View style={styles.topRow}>
            {onChangeLocation ? (
              <PressableScale
                scaleTo={0.97}
                onPress={onChangeLocation}
                contentStyle={styles.placeGroup}>
                <Icon
                  name={manualLabel ? 'map-pin' : 'crosshair'}
                  size={13}
                  color={colors.textMuted}
                />
                <Text style={styles.place} numberOfLines={1}>
                  {placeLabel}
                </Text>
                <Icon name="chevron-down" size={13} color={colors.textMuted} />
              </PressableScale>
            ) : (
              <View style={styles.placeGroup}>
                <Icon name="map-pin" size={13} color={colors.textMuted} />
                <Text style={styles.place} numberOfLines={1}>
                  {placeLabel}
                </Text>
              </View>
            )}
            <Text style={styles.dateLabel} numberOfLines={1}>
              {joinFields(current.date_label, current.time_label) || current.time_label}
            </Text>
          </View>

          <View style={styles.metricGrid}>
            <View style={styles.metric}>
              <Icon name="waves" size={15} color={colors.primary} />
              <Text style={styles.metricValue}>
                {current.humidity}
                {current.humidity_unit}
              </Text>
              <Text style={styles.metricLabel}>Kelembapan</Text>
            </View>
            <View style={styles.metric}>
              <Icon name="refresh" size={15} color={colors.primary} />
              <Text style={styles.metricValue} numberOfLines={1}>
                {current.wind_speed} {current.wind_speed_unit}
              </Text>
              <Text style={styles.metricLabel} numberOfLines={1}>
                {joinFields('Angin', current.wind_direction) || 'Angin'}
              </Text>
            </View>
            <View style={styles.metric}>
              <Icon name="eye" size={15} color={colors.primary} />
              <Text style={styles.metricValue} numberOfLines={1}>
                {current.visibility}
              </Text>
              <Text style={styles.metricLabel}>Jarak pandang</Text>
            </View>
          </View>

          {days.length > 0 ? (
            <View style={styles.forecastRow}>
              {days.map(day => (
                <View key={day.date} style={styles.forecastCol}>
                  <Text style={styles.forecastDay} numberOfLines={1}>
                    {day.label}
                  </Text>
                  <WeatherIcon url={day.representative?.icon_url} size={28} />
                  <Text style={styles.forecastTemp} numberOfLines={1}>
                    {day.maxTemp ?? '–'}° / {day.minTemp ?? '–'}°
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <PressableScale
            scaleTo={0.98}
            onPress={onPress}
            disabled={!onPress}
            contentStyle={styles.footerRow}>
            <Text style={styles.attribution}>Sumber: BMKG</Text>
            {onPress ? (
              <View style={styles.detailHint}>
                <Text style={styles.detailHintText}>Ketuk untuk detail</Text>
                <Icon name="chevron-right" size={13} color={colors.primary} />
              </View>
            ) : null}
          </PressableScale>
        </MotiView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 12,
    ...cardShadow,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 1,
  },
  headerLine: {
    fontSize: 15,
  },
  headerTemp: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.heading,
  },
  headerDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  headerPlace: {
    fontSize: 11,
    color: colors.textMuted,
  },
  body: {
    gap: 12,
  },
  topRow: {
    // Kolom, bukan baris: kalau nama lokasi panjang, tanggal/jam turun ke bawahnya alih-alih
    // terpotong di kanan.
    gap: 2,
  },
  placeGroup: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  place: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  metricGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 12,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
  forecastRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 12,
  },
  forecastCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  forecastDay: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  forecastTemp: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attribution: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.placeholder,
  },
  detailHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailHintText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stateTextGroup: {
    flex: 1,
    gap: 2,
  },
  stateText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  stateHint: {
    fontSize: 11,
    color: colors.placeholder,
  },
});
