import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import GradientButton from '@/components/atoms/GradientButton';
import GradientIconChip from '@/components/atoms/GradientIconChip';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import EmptyState from '@/components/molecules/EmptyState';
import StatDividerRow from '@/components/molecules/StatDividerRow';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getRollCallAgendasApi, getRollCallStatsApi } from '@/services/api/rollCall.service';
import { colors } from '@/theme/colors';
import type { RollCallAgenda, RollCallAgendaList, RollCallStats } from '@/types';
import { extractErrorMessage } from '@/utils/format';
import {
  agendaState,
  attendanceColor,
  formatCount,
  groupByDate,
  rollCallClock,
  rollCallDateLong,
  sortNewestFirst,
} from '@/utils/rollCall';
import { AgendaStateBadge, ProgressBar, SectionHeader, sharedStyles } from '@/screens/RollCall/shared';

type Props = RootStackScreenProps<typeof ROUTES.rollCallAgendas>;

// Daftar agenda apel untuk komandan / petugas piket (GET /roll-calls) + strip statistik bulan
// ini (GET /roll-calls/stats). Agenda yang masih bisa diisi tampil sebagai kartu besar di atas.
export default function RollCallAgendasScreen(props: Props) {
  const { navigation } = props;

  const [list, setList] = useState<RollCallAgendaList | null>(null);
  const [stats, setStats] = useState<RollCallStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isFirstFocus = useRef(true);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);
    const [agendasResult, statsResult] = await Promise.allSettled([
      getRollCallAgendasApi(),
      getRollCallStatsApi(),
    ]);
    if (agendasResult.status === 'fulfilled') setList(agendasResult.value);
    else setErrorMessage(extractErrorMessage(agendasResult.reason, 'Gagal memuat agenda apel.'));
    setStats(statsResult.status === 'fulfilled' ? statsResult.value : null);
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(isFirstFocus.current ? 'initial' : 'refresh');
      isFirstFocus.current = false;
    }, [load]),
  );

  const agendas = sortNewestFirst(list?.agendas ?? []);
  const running = agendas.filter(agenda => agendaState(agenda) === 'open');
  const history = agendas.filter(agenda => agendaState(agenda) !== 'open');
  const canCreate = !!list?.can_create_agenda;
  const representedNames = (list?.represented_company ?? []).map(company => company.name).join(', ');

  function openDetail(agenda: RollCallAgenda) {
    navigation.navigate(ROUTES.rollCallAgendaDetail, { id: agenda.id, deadline: agenda.deadline });
  }

  const monthLabel = new Date().toLocaleDateString('id-ID', { month: 'long' });

  return (
    <MainLayout
      title="Kekuatan Apel"
      subtitle="Piket Batalyon"
      variant="canvas"
      onBack={() => navigation.goBack()}
      right={
        canCreate ? (
          <PressableScale
            accessibilityLabel="Pengaturan apel"
            onPress={() => navigation.navigate(ROUTES.rollCallSettings)}
            contentStyle={sharedStyles.squareButton}>
            <Icon name="settings" size={20} color={colors.primary} />
          </PressableScale>
        ) : undefined
      }>
      {isLoading ? (
        <ActivityIndicator style={sharedStyles.loader} color={colors.primary} />
      ) : (
        <View style={sharedStyles.flex}>
          <ScrollView
            style={sharedStyles.flex}
            contentContainerStyle={sharedStyles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => load('refresh')} tintColor={colors.primary} />
            }>
            {list?.is_representative && representedNames ? (
              <PressableScale
                scaleTo={0.98}
                onPress={() => navigation.navigate(ROUTES.rollCallCompanyAgendas)}
                contentStyle={[sharedStyles.card, styles.stripCard]}
                style={styles.stripSpacing}>
                <GradientIconChip
                  icon="users"
                  colors={[colors.gradientHealthStart, colors.gradientHealthEnd]}
                  size={36}
                  iconSize={18}
                  radius={12}
                />
                <View style={styles.stripBody}>
                  <Text style={styles.stripTitle}>Kompi yang Anda wakili</Text>
                  <Text style={sharedStyles.rowMeta} numberOfLines={1}>
                    {representedNames} · isi kehadiran kompi
                  </Text>
                </View>
                <Icon name="chevron-right" size={16} color={colors.placeholder} />
              </PressableScale>
            ) : null}

            {stats ? (
              <PressableScale
                scaleTo={0.98}
                onPress={() => navigation.navigate(ROUTES.rollCallStats)}
                contentStyle={[sharedStyles.card, styles.stripCard]}
                style={styles.statsSpacing}>
                <GradientIconChip
                  icon="bar-chart"
                  colors={[colors.gradientPrimaryStart, colors.gradientPrimaryEnd]}
                  size={36}
                  iconSize={18}
                  radius={12}
                />
                <View style={styles.stripBody}>
                  <Text style={styles.stripTitle}>Statistik {monthLabel}</Text>
                  <Text style={sharedStyles.rowMeta}>{stats.agendas} agenda · rata-rata kehadiran</Text>
                </View>
                <Text
                  style={[
                    styles.stripValue,
                    { color: stats.present + stats.absent > 0 ? attendanceColor(stats.percentage) : colors.placeholder },
                  ]}>
                  {stats.present + stats.absent > 0 ? `${stats.percentage}%` : '–'}
                </Text>
                <Icon name="chevron-right" size={16} color={colors.placeholder} />
              </PressableScale>
            ) : null}

            {errorMessage ? <Text style={sharedStyles.empty}>{errorMessage}</Text> : null}

            {!errorMessage && agendas.length === 0 ? (
              <EmptyState
                icon="clipboard-check"
                title="Belum ada agenda apel"
                message={
                  canCreate
                    ? 'Buka agenda untuk sesi apel berikutnya. Perwakilan kompi akan langsung diberi tahu.'
                    : 'Belum ada agenda apel untuk satuan Anda.'
                }
                style={styles.emptyState}
              />
            ) : null}

            {running.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader title="Sedang Berjalan" meta={`${running.length} agenda`} />
                <View style={styles.stack}>
                  {running.map(agenda => (
                    <RunningAgendaCard key={agenda.id} agenda={agenda} onPress={() => openDetail(agenda)} />
                  ))}
                </View>
              </View>
            ) : null}

            {history.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader title="Riwayat Agenda" meta={`${history.length} agenda`} />
                {groupByDate(history).map(group => (
                  <View key={group.date} style={styles.dateGroup}>
                    <Text style={sharedStyles.dateLabel}>{rollCallDateLong(group.date)}</Text>
                    <View style={styles.stackTight}>
                      {group.items.map(agenda => (
                        <HistoryAgendaCard key={agenda.id} agenda={agenda} onPress={() => openDetail(agenda)} />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>

          {canCreate ? (
            <View style={sharedStyles.footer}>
              <GradientButton
                label="Buka Agenda Apel"
                icon="plus"
                onPress={() => navigation.navigate(ROUTES.rollCallAgendaCreate)}
              />
            </View>
          ) : null}
        </View>
      )}
    </MainLayout>
  );
}

function RunningAgendaCard(props: { agenda: RollCallAgenda; onPress: () => void }) {
  const { agenda, onPress } = props;
  const { progress, totals } = agenda;
  const deadline = rollCallClock(agenda.deadline);
  const allSubmitted = progress.total > 0 && progress.belum === 0;

  return (
    <PressableScale scaleTo={0.98} onPress={onPress} contentStyle={[sharedStyles.cardRaised, styles.heroCard]}>
      <View style={styles.heroTop}>
        <AgendaStateBadge state="open" />
        {deadline ? (
          <View style={styles.inline}>
            <Icon name="clock" size={14} color={colors.textMuted} />
            <Text style={styles.deadlineText}>Batas {deadline}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.heroTitle}>{agenda.session}</Text>
      <Text style={styles.heroSub}>
        {rollCallDateLong(agenda.date)} · Gelombang {agenda.wave}
      </Text>

      <View style={styles.progressHead}>
        <Text style={styles.progressText}>
          <Text style={styles.progressStrong}>
            {progress.sudah} dari {progress.total}
          </Text>{' '}
          kompi sudah mengirim
        </Text>
        <Text style={styles.progressPercent}>{progress.persen}%</Text>
      </View>
      <ProgressBar percent={progress.persen} />

      <StatDividerRow
        size="md"
        style={styles.heroStats}
        items={[
          { label: 'Anggota', value: formatCount(totals.members) },
          { label: 'Hadir', value: formatCount(totals.present) },
          { label: 'Tidak Hadir', value: formatCount(totals.absent), flex: 1.2 },
          {
            label: 'Kehadiran',
            value: `${totals.persen}%`,
            valueColor: totals.members > 0 ? attendanceColor(totals.persen) : undefined,
            flex: 1.2,
          },
        ]}
      />

      <View style={styles.heroFoot}>
        {allSubmitted ? (
          <View style={styles.inline}>
            <Icon name="check" size={14} color={colors.success} />
            <Text style={[styles.footText, { color: colors.success }]}>Semua kompi sudah mengirim</Text>
          </View>
        ) : (
          <View style={styles.inline}>
            <Icon name="alert-triangle" size={14} color={colors.warningText} />
            <Text style={styles.footText}>{progress.belum} kompi belum mengirim</Text>
          </View>
        )}
        <View style={styles.inline}>
          <Text style={styles.linkText}>Rangkuman</Text>
          <Icon name="chevron-right" size={16} color={colors.primary} />
        </View>
      </View>
    </PressableScale>
  );
}

function HistoryAgendaCard(props: { agenda: RollCallAgenda; onPress: () => void }) {
  const { agenda, onPress } = props;
  const state = agendaState(agenda);
  const { progress, totals } = agenda;

  return (
    <PressableScale scaleTo={0.98} onPress={onPress} contentStyle={[sharedStyles.card, styles.historyCard]}>
      <View style={styles.historyTop}>
        <Text style={styles.historyTitle} numberOfLines={1}>
          {agenda.session}
        </Text>
        <AgendaStateBadge state={state} />
        <Icon name="chevron-right" size={18} color={colors.placeholder} />
      </View>
      <Text style={sharedStyles.rowMeta}>
        Gelombang {agenda.wave} · {progress.sudah}/{progress.total} kompi mengirim
      </Text>
      <View style={styles.historyStats}>
        <Text style={styles.historyStatsText}>
          {formatCount(totals.present)} hadir · {formatCount(totals.absent)} tidak hadir
        </Text>
        {totals.members > 0 ? (
          <Text style={[styles.historyPercent, { color: attendanceColor(totals.persen) }]}>{totals.persen}%</Text>
        ) : null}
      </View>
      {state === 'locked' && progress.belum > 0 ? (
        <View style={[styles.inline, styles.lockedNote]}>
          <Icon name="alert-triangle" size={13} color={colors.warningText} />
          <Text style={styles.footText}>Batas waktu lewat · {progress.belum} kompi tidak mengirim</Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  stripSpacing: { marginBottom: 12 },
  statsSpacing: { marginBottom: 22 },
  stripCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  stripBody: { flex: 1, gap: 2 },
  stripTitle: { fontSize: 14, fontWeight: '700', color: colors.heading },
  stripValue: { fontSize: 17, fontWeight: '800' },
  emptyState: { marginTop: 24 },
  section: { marginBottom: 12 },
  stack: { gap: 14, marginBottom: 12 },
  stackTight: { gap: 10 },
  dateGroup: { marginBottom: 18 },
  heroCard: { paddingBottom: 0 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  deadlineText: { fontSize: 12, fontWeight: '600', color: colors.heading },
  heroTitle: { fontSize: 20, fontWeight: '800', color: colors.heading, letterSpacing: -0.3 },
  heroSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  progressHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  progressText: { fontSize: 13, color: colors.textBody },
  progressStrong: { fontWeight: '700', color: colors.heading },
  progressPercent: { fontSize: 13, fontWeight: '700', color: colors.primary },
  heroStats: { marginTop: 14 },
  heroFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  footText: { fontSize: 12, fontWeight: '600', color: colors.warningText },
  linkText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  historyCard: { gap: 6, paddingVertical: 14 },
  historyTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.heading },
  historyStats: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  historyStatsText: { fontSize: 13, color: colors.textBody },
  historyPercent: { fontSize: 14, fontWeight: '700' },
  lockedNote: { marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderSoft },
});
