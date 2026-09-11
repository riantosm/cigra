import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';
import type { EarthquakeLatest } from '@/types';
import { earthquakeMeta } from '@/utils/earthquake';
import { joinFields } from '@/utils/format';

export interface EarthquakeWidgetProps {
  latest: EarthquakeLatest | null;
  isLoading: boolean;
  error?: string | null;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Kartu Gempa Bumi Terkini BMKG — sel kanan grid 2 kolom di Home (pasangan dengan
// WeatherAlertBanner). Ketuk → layar detail gempa (Terkini / M 5.0+ / Dirasakan).
export default function EarthquakeWidget(props: EarthquakeWidgetProps) {
  const { latest, onPress, style } = props;

  // Best-effort: sebelum data siap / saat gagal, widget tidak ditampilkan sama sekali.
  if (!latest) return null;

  const meta = earthquakeMeta(latest.magnitude, latest.is_tsunami_potential);
  const dateLabel = joinFields(latest.tanggal, latest.jam);

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.root, style]}
      contentStyle={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Gempa terkini magnitudo ${latest.magnitude}, ${latest.wilayah}`}>
      <View style={styles.headRow}>
        <View style={[styles.magBadge, { backgroundColor: `${meta.accent}1F` }]}>
          <Text style={[styles.magValue, { color: meta.accent }]}>{latest.magnitude.toFixed(1)}</Text>
          <Text style={[styles.magUnit, { color: meta.accent }]}>SR</Text>
        </View>
        <Text style={styles.kicker} numberOfLines={1}>
          GEMPA TERKINI
        </Text>
        {latest.is_tsunami_potential ? (
          <View style={styles.tsunamiChip}>
            <Text style={styles.tsunamiChipText}>TSUNAMI</Text>
          </View>
        ) : null}
        {onPress ? <Icon name="chevron-right" size={16} color={colors.textMuted} /> : null}
      </View>
      <Text style={styles.wilayah} numberOfLines={2}>
        {latest.wilayah}
      </Text>
      {dateLabel ? (
        <Text style={styles.date} numberOfLines={1}>
          {dateLabel}
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
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  magBadge: {
    minWidth: 44,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  magValue: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  magUnit: {
    fontSize: 8,
    fontWeight: '700',
    marginTop: -2,
  },
  kicker: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: colors.textMuted,
  },
  tsunamiChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.danger,
  },
  tsunamiChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.dangerForeground,
  },
  wilayah: {
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
