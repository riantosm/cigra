import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import GradientIconChip from '@/components/atoms/GradientIconChip';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import type { WeatherAlert } from '@/types';
import { alertSeverityMeta } from '@/utils/weather';
import { gradientForColor } from '@/utils/gradientColor';

export interface WeatherAlertBannerProps {
  alerts: WeatherAlert[];
  isLoading: boolean;
  error?: string | null;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Kartu Peringatan Dini Cuaca Ekstrem BMKG — sel kiri grid 2 kolom di Home (pasangan dengan
// EarthquakeWidget). Ketuk → layar daftar peringatan. Atribusi "BMKG" ada di layar detail.
export default function WeatherAlertBanner(props: WeatherAlertBannerProps) {
  const { alerts, isLoading, error, onPress, style } = props;

  // Best-effort: jangan tampilkan apa pun sebelum data siap atau saat gagal muat.
  if (isLoading && alerts.length === 0) return null;
  if (error && alerts.length === 0) return null;

  const count = alerts.length;

  if (count === 0) {
    return (
      <PressableScale
        scaleTo={0.98}
        onPress={onPress}
        disabled={!onPress}
        style={[styles.root, style]}
        contentStyle={[styles.card, styles.calmCard]}
        accessibilityRole="button"
        accessibilityLabel="Tidak ada peringatan dini cuaca">
        <View style={styles.headRow}>
          <GradientIconChip
            icon="shield-check"
            colors={[colors.gradientSuccessStart, colors.success]}
            size={30}
            iconSize={16}
            radius={10}
          />
          <Text style={[styles.title, { color: colors.success }]} numberOfLines={1}>
            Cuaca Aman
          </Text>
          {onPress ? <Icon name="chevron-right" size={16} color={colors.textMuted} /> : null}
        </View>
        <Text style={styles.headline} numberOfLines={2}>
          Tidak ada peringatan dini cuaca ekstrem aktif
        </Text>
      </PressableScale>
    );
  }

  const worst = alerts.some(a => a.severity === 'danger') ? 'danger' : 'warning';
  const meta = alertSeverityMeta(worst);
  const headline = alerts[0];

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.root, style]}
      contentStyle={[styles.card, { backgroundColor: meta.surface, borderColor: meta.border }]}
      accessibilityRole="button"
      accessibilityLabel={`${count} peringatan dini cuaca aktif`}>
      <View style={styles.headRow}>
        <GradientIconChip
          icon="alert-triangle"
          colors={gradientForColor(meta.accent)}
          size={30}
          iconSize={16}
          radius={10}
        />
        <Text style={[styles.title, { color: meta.accent }]} numberOfLines={1}>
          {count} Peringatan Dini
        </Text>
        {onPress ? <Icon name="chevron-right" size={16} color={meta.accent} /> : null}
      </View>
      <Text style={styles.headline} numberOfLines={2}>
        {headline.title}
      </Text>
      {headline.pub_date_formatted ? (
        <Text style={styles.date} numberOfLines={1}>
          {headline.pub_date_formatted}
        </Text>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  card: {
    flex: 1,
    gap: 8,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    ...cardShadow,
  },
  calmCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  headline: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 17,
  },
  date: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
