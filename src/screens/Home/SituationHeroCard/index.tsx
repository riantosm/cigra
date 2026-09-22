import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';
import { cardShadowRaised } from '@/theme/shadows';

export interface SituationHeroStat {
  icon: IconName;
  label: string;
  value: string;
  meta: string;
  color: string;
}

export interface SituationHeroCardProps {
  total: string;
  totalSuffix?: string;
  stats: SituationHeroStat[];
  activeAlerts: number;
  onPressAlerts: () => void;
  style?: StyleProp<ViewStyle>;
}

// "Ringkasan Situasi" versi "Aksen Gradient" (DESIGN_SYSTEM.md) — satu kartu hero: header gradient
// primary dengan angka total besar, strip sinyal darurat menyatu di bawahnya (merah kalau aktif,
// hijau tenang kalau tidak), lalu baris mini-stat (garis pemisah antar kolom) menggantikan grid
// StatCard terpisah. Menggantikan kombinasi statGrid + alertBanner yang lama di CommanderHome.
export default function SituationHeroCard(props: SituationHeroCardProps) {
  const { total, totalSuffix = 'personel aktif', stats, activeAlerts, onPressAlerts } = props;
  const isActive = activeAlerts > 0;

  return (
    <View style={[styles.card, props.style]}>
      <View style={styles.gradientWrap}>
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="situationHero" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.gradientPrimaryStart} />
              <Stop offset="1" stopColor={colors.gradientPrimaryEnd} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#situationHero)" />
        </Svg>
        <View style={styles.headerRow}>
          <Text style={styles.headerLabel}>RINGKASAN SITUASI</Text>
          <Icon name="shield-check" size={18} color={colors.primaryForeground} />
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalValue}>{total}</Text>
          <Text style={styles.totalSuffix}> {totalSuffix}</Text>
        </View>
      </View>

      <PressableScale
        scaleTo={0.99}
        onPress={onPressAlerts}
        contentStyle={[styles.alertStrip, isActive ? styles.alertStripActive : styles.alertStripCalm]}>
        <Icon name={isActive ? 'alert-triangle' : 'shield-check'} size={16} color={isActive ? colors.dangerText : colors.success} />
        <Text style={[styles.alertText, { color: isActive ? colors.dangerText : colors.success }]} numberOfLines={1}>
          {isActive ? `${activeAlerts} Sinyal Darurat Aktif — perhatian diperlukan` : 'Tidak ada sinyal darurat aktif'}
        </Text>
        <Icon name="chevron-right" size={15} color={isActive ? colors.dangerText : colors.success} />
      </PressableScale>

      {stats.length > 0 ? (
        <View style={styles.statsRow}>
          {stats.map((stat, index) => (
            <View key={stat.label} style={[styles.statCol, index > 0 && styles.statColBorder]}>
              <Icon name={stat.icon} size={15} color={stat.color} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                {stat.label}
              </Text>
              <Text style={[styles.statMeta, { color: stat.color }]}>{stat.meta}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...cardShadowRaised,
  },
  gradientWrap: {
    padding: 18,
    paddingBottom: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  totalValue: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.primaryForeground,
    letterSpacing: -0.5,
  },
  totalSuffix: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  alertStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  alertStripActive: {
    backgroundColor: colors.alertBannerStart,
    borderBottomWidth: 1,
    borderBottomColor: colors.alertBannerBorder,
  },
  alertStripCalm: {
    backgroundColor: colors.successSurfaceSubtle,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  alertText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingBottom: 14,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingTop: 14,
    paddingHorizontal: 6,
  },
  statColBorder: {
    borderLeftWidth: 1,
    borderLeftColor: colors.borderSoft,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.heading,
  },
  statLabel: {
    fontSize: 10.5,
    color: colors.textMuted,
    textAlign: 'center',
  },
  statMeta: {
    fontSize: 10,
    fontWeight: '600',
  },
});
