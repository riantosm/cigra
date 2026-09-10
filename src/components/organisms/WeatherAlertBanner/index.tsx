import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';
import type { WeatherAlert } from '@/types';
import { alertSeverityMeta } from '@/utils/weather';

export interface WeatherAlertBannerProps {
  alerts: WeatherAlert[];
  isLoading: boolean;
  error?: string | null;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Banner Peringatan Dini Cuaca Ekstrem BMKG di Home (di atas widget cuaca). Ketuk → layar
// daftar peringatan. Atribusi "BMKG" ada di layar detail.
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
        contentStyle={[styles.calm, style]}
        accessibilityRole="button"
        accessibilityLabel="Tidak ada peringatan dini cuaca">
        <Icon name="shield-check" size={15} color={colors.success} />
        <Text style={styles.calmText} numberOfLines={1}>
          Tidak ada peringatan dini cuaca ekstrem
        </Text>
        <Icon name="chevron-right" size={13} color={colors.textMuted} />
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
      contentStyle={[styles.card, { backgroundColor: meta.surface, borderColor: meta.border }, style]}
      accessibilityRole="button"
      accessibilityLabel={`${count} peringatan dini cuaca aktif`}>
      <View style={[styles.iconBadge, { backgroundColor: `${meta.accent}22` }]}>
        <Icon name="alert-triangle" size={18} color={meta.accent} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: meta.accent }]} numberOfLines={1}>
          {count} Peringatan Dini Cuaca Aktif
        </Text>
        <Text style={styles.headline} numberOfLines={2}>
          {headline.title}
        </Text>
        {headline.pub_date_formatted ? (
          <Text style={styles.meta} numberOfLines={1}>
            {headline.pub_date_formatted}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-right" size={16} color={meta.accent} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  calm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  calmText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headline: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
