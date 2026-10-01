import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Badge from '@/components/atoms/Badge';
import GradientAvatar from '@/components/atoms/GradientAvatar';
import GradientButton from '@/components/atoms/GradientButton';
import GradientIconChip from '@/components/atoms/GradientIconChip';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import StatDividerRow from '@/components/molecules/StatDividerRow';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  finishRollCallAgendaApi,
  getRollCallAgendaApi,
  getRollCallAgendaReportApi,
  reopenRollCallAgendaApi,
} from '@/services/api/rollCall.service';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme/colors';
import { smallButtonShadow } from '@/theme/shadows';
import type { RollCallAgendaDetail, RollCallRecapItem } from '@/types';
import { cleanValue, extractErrorMessage, joinFields } from '@/utils/format';
import {
  COMMANDER_ROLE,
  agendaState,
  attendanceColor,
  canManageRollCall,
  formatCount,
  initialsOf,
  rollCallClock,
  rollCallDateLong,
} from '@/utils/rollCall';
import { sendTextToWhatsApp, shareText } from '@/utils/share';
import { AgendaStateBadge, ProgressBar, SectionHeader, sharedStyles } from '@/screens/RollCall/shared';

type Props = RootStackScreenProps<typeof ROUTES.rollCallAgendaDetail>;

const ABSENT_PREVIEW = 5;
const ALL_REASONS = '__all__';

type Modal =
  | { kind: 'confirm-finish' }
  | { kind: 'result'; variant: 'success' | 'error'; title: string; message: string }
  | null;

// Rangkuman agenda (GET /roll-calls/agenda/{id}) — dipakai untuk agenda terbuka maupun yang
// sudah ditutup. Tutup = POST /finish (dengan konfirmasi), buka kembali = POST /reopen. Kartu
// "Laporan Piket Batalyon" mengambil `text` dari GET /agenda/{id}/report lalu membuka WhatsApp /
// share sheet (komandan & piket saja).
export default function RollCallAgendaDetailScreen(props: Props) {
  const { navigation, route } = props;
  const { id, deadline } = route.params;
  const roles = useAppSelector(state => state.auth.user?.roles);
  const canManage = canManageRollCall(roles);
  const isCommander = (roles ?? []).includes(COMMANDER_ROLE);

  const [detail, setDetail] = useState<RollCallAgendaDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reasonFilter, setReasonFilter] = useState<string>(ALL_REASONS);
  const [showAllAbsent, setShowAllAbsent] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [reportAction, setReportAction] = useState<'whatsapp' | 'share' | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const isFirstFocus = useRef(true);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);
      try {
        setDetail(await getRollCallAgendaApi(id));
      } catch (error) {
        setErrorMessage(extractErrorMessage(error, 'Gagal memuat rangkuman agenda.'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [id],
  );

  // Muat ulang tiap kembali ke layar ini (mis. setelah komandan mengisi salah satu kompi).
  useFocusEffect(
    useCallback(() => {
      load(isFirstFocus.current ? 'initial' : 'refresh');
      isFirstFocus.current = false;
    }, [load]),
  );

  const state = detail ? agendaState(detail) : 'open';
  const pending = useMemo(() => (detail?.recap ?? []).filter(item => !item.submitted), [detail]);
  const submitted = useMemo(() => (detail?.recap ?? []).filter(item => item.submitted), [detail]);

  // Chip "per alasan" dihitung di klien dari absent[].absence_reason.
  const reasonChips = useMemo(() => {
    const counts = new Map<string, number>();
    (detail?.absent ?? []).forEach(person => {
      const key = cleanValue(person.absence_reason) ?? 'Tanpa keterangan';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [detail]);

  const filteredAbsent = useMemo(() => {
    const all = detail?.absent ?? [];
    if (reasonFilter === ALL_REASONS) return all;
    return all.filter(person => (cleanValue(person.absence_reason) ?? 'Tanpa keterangan') === reasonFilter);
  }, [detail, reasonFilter]);
  const visibleAbsent = showAllAbsent ? filteredAbsent : filteredAbsent.slice(0, ABSENT_PREVIEW);

  async function handleFinish() {
    setModal(null);
    setIsActing(true);
    try {
      const message = await finishRollCallAgendaApi(id);
      setModal({ kind: 'result', variant: 'success', title: 'Agenda Ditutup', message });
      load('refresh');
    } catch (error) {
      setModal({
        kind: 'result',
        variant: 'error',
        title: 'Gagal Menutup Agenda',
        message: extractErrorMessage(error, 'Agenda gagal ditutup.'),
      });
    } finally {
      setIsActing(false);
    }
  }

  async function handleReopen() {
    setIsActing(true);
    try {
      const message = await reopenRollCallAgendaApi(id);
      setModal({ kind: 'result', variant: 'success', title: 'Agenda Dibuka Kembali', message });
      load('refresh');
    } catch (error) {
      setModal({
        kind: 'result',
        variant: 'error',
        title: 'Gagal Membuka Kembali',
        message: extractErrorMessage(error, 'Agenda gagal dibuka kembali.'),
      });
    } finally {
      setIsActing(false);
    }
  }

  // Laporan diambil baru tiap kali tombol ditekan supaya ikut isian kompi terbaru.
  async function handleSendReport(action: 'whatsapp' | 'share') {
    if (reportAction) return;
    setReportAction(action);
    try {
      const report = await getRollCallAgendaReportApi(id);
      const text = cleanValue(report.text);
      if (!text) {
        setModal({
          kind: 'result',
          variant: 'error',
          title: 'Laporan Belum Tersedia',
          message: 'Teks laporan dari server masih kosong. Coba lagi setelah ada kompi yang mengirim.',
        });
        return;
      }
      if (action === 'whatsapp') await sendTextToWhatsApp(text);
      else await shareText(text, 'Laporan Piket Batalyon');
    } catch (error) {
      setModal({
        kind: 'result',
        variant: 'error',
        title: 'Gagal Memuat Laporan',
        message: extractErrorMessage(error, 'Laporan piket gagal dimuat.'),
      });
    } finally {
      setReportAction(null);
    }
  }

  function openCompanyForm(item: RollCallRecapItem) {
    navigation.navigate(ROUTES.rollCallCompanyForm, {
      agendaId: id,
      unitId: item.unit_id,
      companyName: item.company,
    });
  }

  const deadlineLabel = state === 'open' ? rollCallClock(deadline) : null;
  const canFillPending = isCommander && state === 'open';

  return (
    <MainLayout
      title={detail?.session ?? 'Rangkuman Agenda'}
      subtitle={detail ? `${rollCallDateLong(detail.date)} · Gelombang ${detail.wave}` : undefined}
      variant="canvas"
      onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={sharedStyles.loader} color={colors.primary} />
      ) : !detail ? (
        <Text style={sharedStyles.empty}>{errorMessage ?? 'Agenda tidak ditemukan.'}</Text>
      ) : (
        <View style={sharedStyles.flex}>
          <ScrollView
            style={sharedStyles.flex}
            contentContainerStyle={sharedStyles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => load('refresh')} tintColor={colors.primary} />
            }>
            {state === 'closed' ? (
              <View style={styles.lockBanner}>
                <View style={styles.lockIcon}>
                  <Icon name="lock" size={18} color={colors.textMuted} />
                </View>
                <View style={styles.lockBody}>
                  <Text style={styles.lockTitle}>Agenda sudah ditutup</Text>
                  <Text style={styles.lockText}>
                    Isian kompi terkunci. Buka kembali bila ada yang perlu dikoreksi.
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={[sharedStyles.cardRaised, styles.hero]}>
              <View style={styles.heroTop}>
                <AgendaStateBadge state={state} />
                {deadlineLabel ? (
                  <View style={styles.inline}>
                    <Icon name="clock" size={14} color={colors.textMuted} />
                    <Text style={styles.deadlineText}>
                      Batas pengisian <Text style={styles.deadlineStrong}>{deadlineLabel}</Text>
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.heroCountRow}>
                <View style={styles.heroCountCol}>
                  <Text style={styles.heroCount}>
                    {detail.progress.sudah}
                    <Text style={styles.heroCountTotal}>/{detail.progress.total}</Text>
                  </Text>
                  <Text style={sharedStyles.rowMeta}>kompi sudah mengirim</Text>
                </View>
                <Text style={styles.heroPercent}>{detail.progress.persen}%</Text>
              </View>
              <ProgressBar percent={detail.progress.persen} />
              <StatDividerRow
                size="md"
                style={styles.heroStats}
                items={[
                  { label: 'Anggota', value: formatCount(detail.totals.members) },
                  { label: 'Hadir', value: formatCount(detail.totals.present) },
                  { label: 'Tidak Hadir', value: formatCount(detail.totals.absent), flex: 1.2 },
                  {
                    label: 'Kehadiran',
                    value: `${detail.totals.persen}%`,
                    valueColor: detail.totals.members > 0 ? attendanceColor(detail.totals.persen) : undefined,
                    flex: 1.2,
                  },
                ]}
              />
              <Text style={styles.heroNote}>Jumlah dihitung dari kompi yang sudah mengirim.</Text>
            </View>

            {canManage ? (
              <View style={[sharedStyles.card, styles.reportCard]}>
                <View style={styles.reportHead}>
                  <GradientIconChip
                    icon="send"
                    colors={[colors.gradientSuccessStart, colors.success]}
                    size={40}
                    iconSize={19}
                    radius={12}
                  />
                  <View style={styles.reportBody}>
                    <Text style={styles.reportTitle}>Laporan Piket Batalyon</Text>
                    <Text style={styles.reportText}>
                      Kekuatan, isian per kompi, daftar tidak hadir, dan rincian golongan pangkat — siap
                      dikirim.
                    </Text>
                  </View>
                </View>
                <View style={styles.reportActions}>
                  <GradientButton
                    label="Kirim ke WhatsApp"
                    icon="send"
                    tone="success"
                    height={48}
                    style={sharedStyles.flex}
                    loading={reportAction === 'whatsapp'}
                    disabled={reportAction !== null}
                    onPress={() => handleSendReport('whatsapp')}
                  />
                  <PressableScale
                    accessibilityLabel="Bagikan laporan piket"
                    disabled={reportAction !== null}
                    onPress={() => handleSendReport('share')}
                    contentStyle={[styles.shareButton, reportAction !== null && styles.disabled]}>
                    {reportAction === 'share' ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <>
                        <Icon name="share" size={17} color={colors.primary} />
                        <Text style={styles.shareText}>Bagikan</Text>
                      </>
                    )}
                  </PressableScale>
                </View>
              </View>
            ) : null}

            {pending.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader
                  title="Belum Mengirim"
                  meta={`${pending.length} kompi`}
                  metaColor={colors.warningText}
                />
                <View style={sharedStyles.listCard}>
                  {pending.map((item, index) => {
                    const body = (
                      <View style={[sharedStyles.listRow, index > 0 && sharedStyles.listRowDivider]}>
                        <View style={[styles.rowChip, { backgroundColor: colors.warningSurface }]}>
                          <Icon name="clock" size={16} color={colors.warningText} />
                        </View>
                        <View style={styles.rowBody}>
                          <Text style={sharedStyles.rowTitle}>{item.company}</Text>
                          {/* `members` baru diisi backend setelah kompi mengirim (0 sebelum itu). */}
                          <Text style={sharedStyles.rowMeta}>
                            {item.members > 0 ? `${formatCount(item.members)} anggota` : 'Belum mengirim'}
                          </Text>
                        </View>
                        {canFillPending ? <Icon name="chevron-right" size={16} color={colors.placeholder} /> : null}
                      </View>
                    );
                    return canFillPending ? (
                      <PressableScale key={item.unit_id} scaleTo={0.98} onPress={() => openCompanyForm(item)}>
                        {body}
                      </PressableScale>
                    ) : (
                      <View key={item.unit_id}>{body}</View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {submitted.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader
                  title={pending.length > 0 ? 'Sudah Mengirim' : 'Rekap per Kompi'}
                  meta={`${submitted.length} kompi`}
                />
                <View style={sharedStyles.listCard}>
                  {submitted.map((item, index) => {
                    const ratio = item.members > 0 ? Math.round((item.present / item.members) * 100) : 0;
                    return (
                      <View
                        key={item.unit_id}
                        style={[sharedStyles.listRow, index > 0 && sharedStyles.listRowDivider]}>
                        <View style={[styles.rowChip, { backgroundColor: colors.successSurface }]}>
                          <Icon name="check" size={16} color={colors.success} />
                        </View>
                        <View style={styles.rowBody}>
                          <Text style={sharedStyles.rowTitle}>{item.company}</Text>
                          <Text style={sharedStyles.rowMeta} numberOfLines={1}>
                            {joinFields(item.submitted_by, rollCallClock(item.submitted_at)) || 'Terkirim'}
                          </Text>
                        </View>
                        <View style={styles.rowRight}>
                          <Text style={styles.rowCount}>
                            {formatCount(item.present)}
                            <Text style={styles.rowCountTotal}>/{formatCount(item.members)}</Text>
                          </Text>
                          <Text style={[styles.rowPercent, { color: attendanceColor(ratio) }]}>{ratio}%</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {submitted.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader title="Keterangan Tidak Hadir" meta={`${detail.absent.length} anggota`} />
                {detail.absent.length === 0 ? (
                  <View style={[sharedStyles.card, styles.noAbsent]}>
                    <Icon name="check" size={16} color={colors.success} />
                    <Text style={sharedStyles.rowMeta}>Semua anggota dari kompi yang mengirim hadir.</Text>
                  </View>
                ) : (
                  <>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.chipScroll}
                      contentContainerStyle={styles.chipRow}>
                      <ReasonChip
                        label="Semua"
                        count={detail.absent.length}
                        active={reasonFilter === ALL_REASONS}
                        onPress={() => setReasonFilter(ALL_REASONS)}
                      />
                      {reasonChips.map(chip => (
                        <ReasonChip
                          key={chip.name}
                          label={chip.name}
                          count={chip.count}
                          active={reasonFilter === chip.name}
                          onPress={() => setReasonFilter(chip.name)}
                        />
                      ))}
                    </ScrollView>
                    <View style={sharedStyles.listCard}>
                      {visibleAbsent.map((person, index) => (
                        <View
                          key={`${person.nrp ?? person.name}-${index}`}
                          style={[styles.absentRow, index > 0 && sharedStyles.listRowDivider]}>
                          <GradientAvatar
                            label={initialsOf(person.name)}
                            gradientStart={colors.gradientWarnStart}
                            gradientEnd={colors.warning}
                            size={36}
                          />
                          <View style={styles.rowBody}>
                            <Text style={sharedStyles.rowTitle} numberOfLines={1}>
                              {person.name}
                            </Text>
                            <Text style={sharedStyles.rowMeta} numberOfLines={1}>
                              {joinFields(person.rank, person.nrp, person.company) || '-'}
                            </Text>
                            {cleanValue(person.note) ? (
                              <Text style={styles.absentNote}>{person.note}</Text>
                            ) : null}
                          </View>
                          <Badge
                            label={(cleanValue(person.absence_reason) ?? 'Tanpa keterangan').toUpperCase()}
                            variant="warning"
                            style={styles.reasonBadge}
                          />
                        </View>
                      ))}
                    </View>
                    {filteredAbsent.length > ABSENT_PREVIEW ? (
                      <PressableScale
                        onPress={() => setShowAllAbsent(current => !current)}
                        contentStyle={styles.moreButton}
                        style={styles.moreSpacing}>
                        <Text style={styles.moreText}>
                          {showAllAbsent ? 'Tampilkan lebih sedikit' : `Lihat semua ${filteredAbsent.length} anggota`}
                        </Text>
                        <Icon name={showAllAbsent ? 'chevron-up' : 'chevron-down'} size={15} color={colors.primary} />
                      </PressableScale>
                    ) : null}
                  </>
                )}
              </View>
            ) : null}
          </ScrollView>

          {canManage ? (
            <View style={sharedStyles.footer}>
              {state === 'closed' ? (
                <PressableScale
                  disabled={isActing}
                  onPress={handleReopen}
                  contentStyle={[styles.secondaryButton, isActing && styles.disabled]}>
                  {isActing ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <>
                      <Icon name="unlock" size={19} color={colors.primary} />
                      <Text style={styles.secondaryText}>Buka Kembali Agenda</Text>
                    </>
                  )}
                </PressableScale>
              ) : (
                <>
                  {pending.length > 0 ? (
                    <View style={styles.footHintRow}>
                      <Icon name="alert-triangle" size={14} color={colors.warningText} />
                      <Text style={sharedStyles.footerWarn}>{pending.length} kompi belum mengirim</Text>
                    </View>
                  ) : (
                    <Text style={sharedStyles.footerHint}>Semua kompi sudah mengirim</Text>
                  )}
                  <GradientButton
                    label="Tutup Agenda"
                    icon="lock"
                    loading={isActing}
                    disabled={isActing}
                    onPress={() => setModal({ kind: 'confirm-finish' })}
                  />
                </>
              )}
            </View>
          ) : null}
        </View>
      )}

      <StatusModal
        visible={modal?.kind === 'confirm-finish'}
        variant="error"
        title="Tutup agenda sekarang?"
        message={
          pending.length > 0
            ? `${pending.length} kompi belum mengirim. Setelah ditutup, kompi tidak bisa mengisi atau memperbaiki isian. Agenda masih bisa dibuka kembali bila perlu koreksi.`
            : 'Setelah ditutup, kompi tidak bisa memperbaiki isian. Agenda masih bisa dibuka kembali bila perlu koreksi.'
        }
        onRequestClose={() => setModal(null)}
        secondaryAction={{ label: 'Batal', onPress: () => setModal(null) }}
        primaryAction={{ label: 'Tutup Agenda', onPress: handleFinish }}
      />
      <StatusModal
        visible={modal?.kind === 'result'}
        variant={modal?.kind === 'result' ? modal.variant : 'success'}
        title={modal?.kind === 'result' ? modal.title : ''}
        message={modal?.kind === 'result' ? modal.message : ''}
        onRequestClose={() => setModal(null)}
        primaryAction={{ label: 'Tutup', onPress: () => setModal(null) }}
      />
    </MainLayout>
  );
}

function ReasonChip(props: { label: string; count: number; active: boolean; onPress: () => void }) {
  const { label, count, active, onPress } = props;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityState={{ selected: active }}
      contentStyle={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
      <Text style={[styles.chipCount, active && styles.chipCountActive]}>{count}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.neutralSurface,
  },
  lockIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  lockBody: { flex: 1, gap: 2 },
  lockTitle: { fontSize: 14, fontWeight: '700', color: colors.heading },
  lockText: { fontSize: 12, lineHeight: 17, color: colors.textMuted },
  hero: { paddingBottom: 12, marginBottom: 24 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  deadlineText: { fontSize: 12, color: colors.textMuted },
  deadlineStrong: { fontWeight: '700', color: colors.heading },
  heroCountRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 },
  heroCountCol: { gap: 2 },
  heroCount: { fontSize: 32, fontWeight: '800', color: colors.heading, letterSpacing: -0.6, lineHeight: 36 },
  heroCountTotal: { fontSize: 20, fontWeight: '700', color: colors.placeholder },
  heroPercent: { fontSize: 15, fontWeight: '700', color: colors.primary },
  heroStats: { marginTop: 16 },
  heroNote: { fontSize: 11, color: colors.placeholder, marginTop: 2 },
  reportCard: { gap: 14, marginTop: -8, marginBottom: 24 },
  reportHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reportBody: { flex: 1, gap: 2 },
  reportTitle: { fontSize: 15, fontWeight: '700', color: colors.heading },
  reportText: { fontSize: 12, lineHeight: 17, color: colors.textMuted },
  reportActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shareButton: {
    height: 48,
    minWidth: 112,
    paddingHorizontal: 16,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...smallButtonShadow,
  },
  shareText: { fontSize: 14, fontWeight: '600', color: colors.heading },
  section: { marginBottom: 24 },
  rowChip: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  rowCount: { fontSize: 14, fontWeight: '700', color: colors.heading },
  rowCountTotal: { fontWeight: '500', color: colors.placeholder },
  rowPercent: { fontSize: 11, fontWeight: '700' },
  noAbsent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipScroll: { marginHorizontal: -20, marginBottom: 12 },
  chipRow: { gap: 8, paddingHorizontal: 20 },
  chip: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { fontSize: 13, fontWeight: '600', color: colors.heading },
  chipLabelActive: { fontWeight: '700', color: colors.primaryForeground },
  chipCount: { fontSize: 13, color: colors.textMuted },
  chipCountActive: { color: colors.primarySurface },
  absentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  absentNote: { fontSize: 12, color: colors.textBody, marginTop: 1 },
  reasonBadge: { alignSelf: 'flex-start' },
  moreSpacing: { marginTop: 12 },
  moreButton: {
    height: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.chipSurface,
  },
  moreText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  footHintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryButton: {
    height: 54,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...smallButtonShadow,
  },
  secondaryText: { fontSize: 15, fontWeight: '700', color: colors.heading },
  disabled: { opacity: 0.6 },
});
