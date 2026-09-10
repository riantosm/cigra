import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';
import type { EarthquakeLatest } from '@/types';
import { formatRelativeTime, joinFields } from '@/utils/format';
import { earthquakeMeta } from '@/utils/earthquake';

export interface EarthquakeWidgetProps {
  latest: EarthquakeLatest | null;
  isLoading: boolean;
  error?: string | null;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Widget Gempa Bumi Terkini BMKG di Home (di bawah widget cuaca). Ketuk → layar detail gempa
// (Terkini / M 5.0+ / Dirasakan). Atribusi "BMKG" ada di layar detail.
export default function EarthquakeWidget(props: EarthquakeWidgetProps) {
  const { latest, onPress, style } = props;

  // Best-effort: sebelum data siap / saat gagal, widget tidak ditampilkan sama sekali.
  if (!latest) return null;

  const meta = earthquakeMeta(latest.magnitude, latest.is_tsunami_potential);
  const rel = formatRelativeTime(latest.datetime_utc);

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={onPress}
      disabled={!onPress}
      contentStyle={[styles.card, style]}
      accessibilityRole="button"
      accessibilityLabel={`Gempa terkini magnitudo ${latest.magnitude}, ${latest.wilayah}`}>
      <View style={[styles.magBadge, { backgroundColor: `${meta.accent}1F`, borderColor: meta.border }]}>
        <Text style={[styles.magValue, { color: meta.accent }]}>{latest.magnitude.toFixed(1)}</Text>
        <Text style={[styles.magUnit, { color: meta.accent }]}>SR</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.headRow}>
          <Text style={styles.kicker}>GEMPA TERKINI</Text>
          {latest.is_tsunami_potential ? (
            <View style={styles.tsunamiChip}>
              <Icon name="alert-triangle" size={11} color={colors.dangerForeground} />
              <Text style={styles.tsunamiChipText}>TSUNAMI</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.wilayah} numberOfLines={2}>
          {latest.wilayah}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {joinFields(rel ?? latest.jam, `${latest.kedalaman} dalam`, latest.potensi)}
        </Text>
      </View>

      <Icon name="chevron-right" size={16} color={colors.textMuted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  magBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  magValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  magUnit: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: -2,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: colors.textMuted,
  },
  tsunamiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
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
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
