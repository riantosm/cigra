import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import GradientIconChip from '@/components/atoms/GradientIconChip';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import CoopDeltaPill from '@/components/molecules/CoopDeltaPill';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import type { CoopOverview } from '@/types';
import {
  COOP_TREND_META,
  coopDeltaFromSeries,
  formatPercent,
  formatRupiah,
} from '@/utils/coopSalary';

export interface CoopReportCardProps {
  // `GET /coop-salary-report` dengan `manager` terisi (capabilities.can_view_all_reports).
  overview: CoopOverview;
  onPressReport: (reportId: number, periodLabel: string) => void;
  onPressOwnBill: (rowId: number) => void;
  style?: StyleProp<ViewStyle>;
}

// Section "Tagihan Koperasi" di CommanderHome (di bawah Ringkasan Situasi): kartu rekap satuan
// periode terbaru (total, naik/turun, keterkaitan NRP) + baris "Tagihan Saya" milik komandan
// sendiri bila `capabilities.has_own_tagihan`.
export default function CoopReportCard(props: CoopReportCardProps) {
  const { overview, onPressReport, onPressOwnBill, style } = props;
  const manager = overview.manager;
  const latest = manager?.summary.latest_period ?? null;
  const ownLatest = overview.capabilities.has_own_tagihan ? overview.member?.summary.latest ?? null : null;
  const ownPeriodLabel = ownLatest?.period?.label ?? overview.member?.rows[0]?.period.label ?? null;

  const latestReport = manager?.reports.find(report => report.id === latest?.id) ?? null;
  const memberTrend = manager?.trend.members ?? [];
  const memberCount = latestReport?.member_count ?? memberTrend[memberTrend.length - 1] ?? 0;
  const unlinked = latestReport?.unlinked_count ?? manager?.summary.latest_unlinked_count ?? 0;
  const linked = latestReport?.linked_count ?? Math.max(memberCount - unlinked, 0);
  const linkedPercent = memberCount > 0 ? (linked / memberCount) * 100 : 0;

  const delta = coopDeltaFromSeries(manager?.trend.totals);
  const previousLabel = manager?.trend.labels[manager.trend.labels.length - 2];
  let deltaText = 'Periode pertama yang tercatat';
  if (delta && previousLabel) {
    deltaText =
      delta.trend === 'flat'
        ? `Sama dengan ${previousLabel}`
        : `${COOP_TREND_META[delta.trend].verb} ${formatRupiah(Math.abs(delta.delta))} dari ${previousLabel}`;
  }

  return (
    <View style={style}>
      {latest ? (
        <PressableScale
          scaleTo={0.98}
          onPress={() => onPressReport(latest.id, latest.period_label)}
          contentStyle={styles.card}>
          <View style={styles.header}>
            <GradientIconChip icon="wallet" colors={[colors.gradientSuccessStart, colors.success]} size={36} iconSize={18} radius={11} />
            <View style={styles.headerBody}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Rekap Satuan · {latest.period_label}
              </Text>
              <Text style={styles.headerSub}>{memberCount} anggota ditagih</Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.placeholder} />
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
              {latest.total_amount_formatted}
            </Text>
            {delta && delta.trend !== 'flat' ? (
              <CoopDeltaPill trend={delta.trend} label={formatPercent(delta.percent)} style={styles.pill} />
            ) : null}
          </View>
          <Text style={styles.deltaText}>{deltaText}</Text>

          <View style={styles.linkHead}>
            <Text style={styles.linkLabel}>NRP tertaut ke akun personil</Text>
            <Text style={styles.linkValue}>
              {linked} / {memberCount}
            </Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${Math.max(linkedPercent, linked > 0 ? 2 : 0)}%` }]} />
          </View>
          {unlinked > 0 ? (
            <View style={styles.warning}>
              <Icon name="alert-triangle" size={15} color={colors.warningText} />
              <Text style={styles.warningText}>{unlinked} anggota belum tertaut ke akun personil</Text>
            </View>
          ) : null}
        </PressableScale>
      ) : (
        <View style={[styles.card, styles.emptyCard]}>
          <View style={styles.emptyIcon}>
            <Icon name="receipt" size={20} color={colors.placeholder} />
          </View>
          <View style={styles.emptyBody}>
            <Text style={styles.emptyTitle}>Belum ada rekap koperasi</Text>
            <Text style={styles.emptyText}>Rekap muncul setelah diunggah dari web admin koperasi.</Text>
          </View>
        </View>
      )}

      {ownLatest ? (
        <PressableScale
          scaleTo={0.98}
          onPress={() => onPressOwnBill(ownLatest.id)}
          style={styles.ownWrap}
          contentStyle={styles.ownRow}>
          <GradientIconChip icon="receipt" colors={[colors.gradientPrimaryStart, colors.gradientPrimaryEnd]} size={36} iconSize={18} radius={11} />
          <View style={styles.headerBody}>
            <Text style={styles.headerTitle}>Tagihan Saya</Text>
            {ownPeriodLabel ? <Text style={styles.headerSub}>{ownPeriodLabel}</Text> : null}
          </View>
          <Text style={styles.ownAmount}>{ownLatest.total_formatted}</Text>
          <Icon name="chevron-right" size={18} color={colors.placeholder} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  headerBody: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.heading,
  },
  headerSub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  amount: {
    flexShrink: 1,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.heading,
  },
  pill: {
    alignSelf: 'auto',
    marginBottom: 3,
  },
  deltaText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 14,
  },
  linkHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  linkLabel: {
    fontSize: 12,
    color: colors.textBody,
  },
  linkValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.heading,
  },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.neutralSurface,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.warningSurface,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.warningText,
  },
  ownWrap: {
    marginTop: 10,
  },
  ownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  ownAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.heading,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutralSurface,
  },
  emptyBody: {
    flex: 1,
    gap: 2,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.heading,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
});
