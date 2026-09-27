import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Badge from '@/components/atoms/Badge';
import GradientAvatar from '@/components/atoms/GradientAvatar';
import GradientButton from '@/components/atoms/GradientButton';
import type { IconName } from '@/components/atoms/Icon';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import EmptyState from '@/components/molecules/EmptyState';
import BottomSheet from '@/components/organisms/BottomSheet';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  endRollCallRepresentativeApi,
  getRollCallAgendaApi,
  getRollCallAgendasApi,
  getRollCallRepresentativesApi,
  toggleRollCallRepresentativeApi,
} from '@/services/api/rollCall.service';
import { colors } from '@/theme/colors';
import type { RollCallAgenda, RollCallRepresentative } from '@/types';
import { extractErrorMessage } from '@/utils/format';
import { initialsOf, rollCallDateLabel, sortNewestFirst } from '@/utils/rollCall';
import { InfoHint, SectionHeader, sharedStyles } from '@/screens/RollCall/shared';

type Props = RootStackScreenProps<typeof ROUTES.rollCallRepresentatives>;

interface CompanyRow {
  unitId: number;
  company: string;
  rep: RollCallRepresentative | null;
}

type Modal =
  | { kind: 'confirm-end'; row: CompanyRow }
  | { kind: 'error'; title: string; message: string }
  | null;

// Perwakilan kompi. Belum ada endpoint daftar kompi, jadi kompi diambil dari `recap[]` agenda
// terakhir (cadangan: `represented_company` dari GET /roll-calls) lalu digabung dengan
// GET /roll-calls/representatives lewat unit_id. Menunjuk orang baru untuk kompi yang sudah
// punya perwakilan otomatis menggantikan yang lama.
export default function RollCallRepresentativesScreen(props: Props) {
  const { navigation } = props;

  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [sourceAgenda, setSourceAgenda] = useState<RollCallAgenda | null>(null);
  const [canCreateAgenda, setCanCreateAgenda] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionRow, setActionRow] = useState<CompanyRow | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const isFirstFocus = useRef(true);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const [reps, agendaList] = await Promise.all([getRollCallRepresentativesApi(), getRollCallAgendasApi()]);
      const latest = sortNewestFirst(agendaList.agendas)[0] ?? null;
      // Sumber utama = recap[] agenda terakhir. Belum ada agenda → pakai `represented_company`
      // (untuk komandan berisi semua kompi, sesuai respons asli yang dicek 2026-09-26).
      const units = latest
        ? (await getRollCallAgendaApi(latest.id)).recap.map(item => ({ id: item.unit_id, name: item.company }))
        : agendaList.represented_company;
      const pickRep = (unitId: number) => {
        const matches = reps.filter(rep => rep.unit_id === unitId);
        return matches.find(rep => rep.is_active) ?? matches[0] ?? null;
      };
      const merged: CompanyRow[] = units.map(unit => ({
        unitId: unit.id,
        company: unit.name,
        rep: pickRep(unit.id),
      }));
      // Perwakilan untuk kompi yang tidak muncul di agenda terakhir tetap ditampilkan.
      reps.forEach(rep => {
        if (!merged.some(row => row.unitId === rep.unit_id)) {
          merged.push({ unitId: rep.unit_id, company: rep.company, rep: pickRep(rep.unit_id) });
        }
      });
      setRows(merged);
      setSourceAgenda(latest);
      setCanCreateAgenda(agendaList.can_create_agenda);
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Gagal memuat perwakilan kompi.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(isFirstFocus.current ? 'initial' : 'refresh');
      isFirstFocus.current = false;
    }, [load]),
  );

  function openAppoint(row: CompanyRow) {
    setActionRow(null);
    navigation.navigate(ROUTES.rollCallAppoint, {
      kind: 'representative',
      unitId: row.unitId,
      companyName: row.company,
      current: row.rep ? { name: row.rep.name, username: row.rep.username, isActive: row.rep.is_active } : null,
    });
  }

  async function handleToggle(row: CompanyRow) {
    if (!row.rep) return;
    const rep = row.rep;
    setActionRow(null);
    try {
      const isActive = await toggleRollCallRepresentativeApi(rep.id);
      setRows(list =>
        list.map(item => (item.rep?.id === rep.id ? { ...item, rep: { ...rep, is_active: isActive } } : item)),
      );
    } catch (error) {
      setModal({
        kind: 'error',
        title: 'Gagal Mengubah Status',
        message: extractErrorMessage(error, 'Status perwakilan gagal diubah.'),
      });
    }
  }

  async function handleEnd(row: CompanyRow) {
    if (!row.rep) return;
    const rep = row.rep;
    setModal(null);
    try {
      await endRollCallRepresentativeApi(rep.id);
      setRows(list => list.map(item => (item.rep?.id === rep.id ? { ...item, rep: null } : item)));
    } catch (error) {
      setModal({
        kind: 'error',
        title: 'Gagal Mengakhiri Penugasan',
        message: extractErrorMessage(error, 'Penugasan gagal diakhiri.'),
      });
    }
  }

  const emptyCount = rows.filter(row => !row.rep).length;
  const actionRep = actionRow?.rep ?? null;
  const confirmRow = modal?.kind === 'confirm-end' ? modal.row : null;

  return (
    <MainLayout
      title="Perwakilan Kompi"
      subtitle="Mengisi kehadiran kompinya tiap apel"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={sharedStyles.loader} color={colors.primary} />
      ) : (
        <ScrollView
          style={sharedStyles.flex}
          contentContainerStyle={sharedStyles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => load('refresh')} tintColor={colors.primary} />
          }>
          {errorMessage ? <Text style={sharedStyles.empty}>{errorMessage}</Text> : null}

          {!errorMessage && rows.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="users"
                title="Daftar kompi belum tersedia"
                message="Daftar kompi diambil dari agenda terakhir. Buka agenda pertama dulu, lalu tunjuk perwakilan tiap kompi di sini."
              />
              {canCreateAgenda ? (
                <GradientButton
                  label="Buka Agenda Apel"
                  icon="plus"
                  height={48}
                  style={styles.emptyCta}
                  onPress={() => navigation.navigate(ROUTES.rollCallAgendaCreate)}
                />
              ) : null}
            </View>
          ) : null}

          {rows.length > 0 ? (
            <>
              {sourceAgenda ? (
                <InfoHint
                  style={styles.sourceHint}
                  text={`Daftar kompi mengikuti agenda terakhir (${sourceAgenda.session}, ${rollCallDateLabel(sourceAgenda.date)}).`}
                />
              ) : null}
              <SectionHeader
                title={`${rows.length} Kompi`}
                meta={emptyCount > 0 ? `${emptyCount} belum ada perwakilan` : 'Semua kompi terisi'}
                metaColor={emptyCount > 0 ? colors.warningText : undefined}
              />
              <View style={sharedStyles.listCard}>
                {rows.map((row, index) => (
                  <View key={row.unitId} style={[sharedStyles.listRow, index > 0 && sharedStyles.listRowDivider]}>
                    <View style={styles.body}>
                      <View style={styles.companyRow}>
                        <Text style={styles.company}>{row.company}</Text>
                        {row.rep && !row.rep.is_active ? <Badge label="NONAKTIF" variant="neutral" /> : null}
                      </View>
                      {row.rep ? (
                        <>
                          <Text style={[styles.repName, !row.rep.is_active && styles.dim]} numberOfLines={1}>
                            {row.rep.name}
                          </Text>
                          {row.rep.username ? (
                            <Text style={sharedStyles.rowMetaFaint} numberOfLines={1}>
                              {row.rep.username}
                            </Text>
                          ) : null}
                        </>
                      ) : (
                        <View style={styles.emptyRow}>
                          <Icon name="alert-triangle" size={13} color={colors.warningText} />
                          <Text style={styles.emptyText}>Belum ada perwakilan</Text>
                        </View>
                      )}
                    </View>
                    {row.rep ? (
                      <PressableScale
                        accessibilityLabel={`Aksi untuk perwakilan ${row.company}`}
                        onPress={() => setActionRow(row)}
                        contentStyle={sharedStyles.chipButton}>
                        <Icon name="more-vertical" size={20} color={colors.primary} />
                      </PressableScale>
                    ) : (
                      <PressableScale
                        accessibilityLabel={`Tunjuk perwakilan ${row.company}`}
                        onPress={() => openAppoint(row)}
                        contentStyle={styles.appointPill}>
                        <Icon name="plus" size={14} color={colors.primary} />
                        <Text style={styles.appointText}>Tunjuk</Text>
                      </PressableScale>
                    )}
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>
      )}

      <BottomSheet visible={actionRow != null} onRequestClose={() => setActionRow(null)}>
        {actionRow && actionRep ? (
          <View>
            <View style={styles.sheetHead}>
              <GradientAvatar
                label={initialsOf(actionRep.name)}
                gradientStart={actionRep.is_active ? colors.gradientPrimaryStart : colors.gradientInactiveStart}
                gradientEnd={actionRep.is_active ? colors.gradientPrimaryEnd : colors.gradientInactiveEnd}
                size={44}
              />
              <View style={styles.body}>
                <View style={styles.companyRow}>
                  <Text style={styles.sheetTitle}>{actionRow.company}</Text>
                  {!actionRep.is_active ? <Badge label="NONAKTIF" variant="neutral" /> : null}
                </View>
                <Text style={styles.repName}>{actionRep.name}</Text>
                {actionRep.username ? <Text style={sharedStyles.rowMetaFaint}>{actionRep.username}</Text> : null}
              </View>
            </View>
            <View style={styles.actionCard}>
              <ActionRow
                icon="swap"
                tint={colors.chipSurface}
                color={colors.primary}
                title="Ganti Perwakilan"
                description={`Tunjuk orang lain. ${actionRep.name} otomatis dicabut.`}
                onPress={() => openAppoint(actionRow)}
                chevron
              />
              <ActionRow
                icon={actionRep.is_active ? 'user-x' : 'user-check'}
                tint={actionRep.is_active ? colors.neutralSurface : colors.successSurface}
                color={actionRep.is_active ? colors.textMuted : colors.success}
                title={actionRep.is_active ? 'Nonaktifkan Sementara' : 'Aktifkan Kembali'}
                description={
                  actionRep.is_active
                    ? `${actionRep.name} tidak bisa mengisi kehadiran sampai diaktifkan lagi.`
                    : `${actionRep.name} bisa mengisi kehadiran ${actionRow.company} lagi.`
                }
                onPress={() => handleToggle(actionRow)}
                divided
              />
              <ActionRow
                icon="user-x"
                tint={colors.dangerSurfaceSoft}
                color={colors.danger}
                title="Akhiri Penugasan"
                titleColor={colors.danger}
                description={`${actionRow.company} jadi tanpa perwakilan.`}
                onPress={() => {
                  const row = actionRow;
                  setActionRow(null);
                  setModal({ kind: 'confirm-end', row });
                }}
                divided
              />
            </View>
            <PressableScale onPress={() => setActionRow(null)} contentStyle={styles.sheetClose}>
              <Text style={styles.sheetCloseText}>Tutup</Text>
            </PressableScale>
          </View>
        ) : null}
      </BottomSheet>

      <StatusModal
        visible={modal?.kind === 'confirm-end'}
        variant="error"
        title={`Akhiri penugasan ${confirmRow?.rep?.name ?? ''}?`}
        message={`${confirmRow?.company ?? 'Kompi ini'} tidak punya perwakilan sampai ada yang ditunjuk lagi. Akses mengisi kehadiran dicabut otomatis.`}
        onRequestClose={() => setModal(null)}
        secondaryAction={{ label: 'Batal', onPress: () => setModal(null) }}
        primaryAction={{ label: 'Akhiri', onPress: () => confirmRow && handleEnd(confirmRow) }}
      />
      <StatusModal
        visible={modal?.kind === 'error'}
        variant="error"
        title={modal?.kind === 'error' ? modal.title : ''}
        message={modal?.kind === 'error' ? modal.message : ''}
        onRequestClose={() => setModal(null)}
        primaryAction={{ label: 'Tutup', onPress: () => setModal(null) }}
      />
    </MainLayout>
  );
}

function ActionRow(props: {
  icon: IconName;
  tint: string;
  color: string;
  title: string;
  titleColor?: string;
  description: string;
  onPress: () => void;
  chevron?: boolean;
  divided?: boolean;
}) {
  const { icon, tint, color, title, titleColor, description, onPress, chevron, divided } = props;
  return (
    <PressableScale
      scaleTo={0.98}
      onPress={onPress}
      contentStyle={[styles.actionRow, divided && sharedStyles.listRowDivider]}>
      <View style={[styles.actionIcon, { backgroundColor: tint }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.actionTitle, titleColor ? { color: titleColor } : null]}>{title}</Text>
        <Text style={sharedStyles.rowMeta}>{description}</Text>
      </View>
      {chevron ? <Icon name="chevron-right" size={16} color={colors.placeholder} /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { marginTop: 24 },
  emptyCta: { marginTop: 16 },
  sourceHint: { marginBottom: 16 },
  body: { flex: 1, minWidth: 0, gap: 3 },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  company: { fontSize: 15, fontWeight: '700', color: colors.heading },
  repName: { fontSize: 13, color: colors.textBody },
  dim: { opacity: 0.6 },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  emptyText: { fontSize: 12, fontWeight: '600', color: colors.warningText },
  appointPill: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
    backgroundColor: colors.primaryTintSurface,
  },
  appointText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.heading },
  actionCard: {
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  actionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 15, fontWeight: '600', color: colors.heading },
  sheetClose: {
    height: 52,
    marginTop: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  sheetCloseText: { fontSize: 15, fontWeight: '600', color: colors.heading },
});
