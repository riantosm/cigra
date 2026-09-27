import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import GradientIconChip from '@/components/atoms/GradientIconChip';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import CoopDeltaPill from '@/components/molecules/CoopDeltaPill';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import type { CoopOverview } from '@/types';
import { coopDeltaFromSeries, coopDeltaSentence, formatPercent } from '@/utils/coopSalary';
import { joinFields } from '@/utils/format';

export interface CoopReportCardProps {
  // `GET /coop-salary-report` mode manager (blok `manager` terisi).
  overview: CoopOverview;
  onPressReport: (reportId: number, periodLabel: string) => void;
  onPressOwnBill: (rowId: number) => void;
  style?: StyleProp<ViewStyle>;
}

// Kartu "Tagihan Koperasi" di Home untuk mode manager — dipakai CommanderHome dan MemberHome (Juyar /
// petugas_laporan_koperasi): rekap satuan periode terbaru (total, naik/turun, peringatan NRP belum
// tertaut) + baris "Tagihan Saya" di dalam kartu yang sama bila akun punya tagihan sendiri.
export default function CoopReportCard(props: CoopReportCardProps) {
  const { overview, onPressReport, onPressOwnBill, style } = props;
  const manager = overview.manager;
  const latest = manager?.summary.latest_period ?? null;
  const ownRow = overview.capabilities.has_own_tagihan ? overview.member?.rows[0] ?? null : null;
  const ownLatestId = overview.member?.summary.latest?.id ?? ownRow?.id ?? null;
  const ownTotal = overview.member?.summary.latest?.total_formatted ?? ownRow?.total_formatted ?? null;
  const ownPeriodLabel = overview.member?.summary.latest?.period?.label ?? ownRow?.period.label ?? null;
  const ownIsFirst = (overview.member?.summary.periods ?? 0) === 1;

  const latestReport = manager?.reports.find(report => report.id === latest?.id) ?? null;
  const memberTrend = manager?.trend.members ?? [];
  const memberCount = latestReport?.member_count ?? memberTrend[memberTrend.length - 1] ?? null;
  const unlinked = latestReport?.unlinked_count ?? manager?.summary.latest_unlinked_count ?? 0;

  const delta = coopDeltaFromSeries(manager?.trend.totals);
  const previousLabel = manager?.trend.labels[manager.trend.labels.length - 2];

  return (
    <View style={[styles.card, style]}>
      {latest ? (
        <PressableScale scaleTo={0.98} onPress={() => onPressReport(latest.id, latest.period_label)} contentStyle={styles.main}>
          <View style={styles.header}>
            <GradientIconChip
              icon="receipt"
              colors={[colors.gradientPrimaryStart, colors.gradientPrimaryEnd]}
              size={36}
              iconSize={18}
              radius={11}
            />
            <View style={styles.headerBody}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Rekap Satuan · {latest.period_label}
              </Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                {joinFields(memberCount != null ? `${memberCount} anggota` : null, latestReport?.title) || 'Rekap satuan'}
              </Text>
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
          <Text style={styles.deltaText}>{coopDeltaSentence(delta, previousLabel)}</Text>

          {unlinked > 0 ? (
            <View style={styles.warning}>
              <Icon name="alert-triangle" size={15} color={colors.warningText} />
              <Text style={styles.warningText}>{unlinked} anggota belum tertaut ke akun personel</Text>
            </View>
          ) : null}
        </PressableScale>
      ) : (
        <View style={[styles.main, styles.emptyRow]}>
          <View style={styles.emptyIcon}>
            <Icon name="receipt" size={20} color={colors.placeholder} />
          </View>
          <View style={styles.headerBody}>
            <Text style={styles.emptyTitle}>Belum ada rekap koperasi</Text>
            <Text style={styles.emptyText}>Rekap muncul setelah diunggah dari web admin koperasi.</Text>
          </View>
        </View>
      )}

      {ownLatestId != null && ownTotal ? (
        <PressableScale scaleTo={0.98} onPress={() => onPressOwnBill(ownLatestId)} contentStyle={styles.ownRow}>
          <GradientIconChip
            icon="wallet"
            colors={[colors.gradientSuccessStart, colors.success]}
            size={32}
            iconSize={16}
            radius={10}
          />
          <View style={styles.headerBody}>
            <Text style={styles.headerTitle}>Tagihan Saya</Text>
            {ownPeriodLabel ? (
              <Text style={styles.headerSub} numberOfLines={1}>
                {ownIsFirst ? `${ownPeriodLabel} · periode pertama` : ownPeriodLabel}
              </Text>
            ) : null}
          </View>
          <Text style={styles.ownAmount}>{ownTotal}</Text>
          <Icon name="chevron-right" size={16} color={colors.placeholder} />
        </PressableScale>
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
    overflow: 'hidden',
    ...cardShadow,
  },
  main: {
    padding: 16,
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
  ownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  ownAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.heading,
  },
  emptyRow: {
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
