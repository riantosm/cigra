import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Badge from '@/components/atoms/Badge';
import type { BadgeVariant } from '@/components/atoms/Badge';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import SecureImage from '@/components/atoms/SecureImage';
import Card from '@/components/molecules/Card';
import SegmentedControl from '@/components/molecules/SegmentedControl';
import BottomSheet from '@/components/organisms/BottomSheet';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { closeRollCallApi, getRollCallDetailApi } from '@/services/api/rollCall.service';
import { colors } from '@/theme/colors';
import type { RollCallDetail, RollCallEntryStatus } from '@/types';
import { isDisplayablePhoto } from '@/utils/avatar';
import { extractErrorMessage } from '@/utils/format';
import { attendanceColor, rollCallDateLong, rollCallTimeLabel } from '@/utils/rollCall';

type Props = RootStackScreenProps<typeof ROUTES.rollCallDetail>;

type AttendanceTab = 'present' | 'absent' | 'unmarked';

// Data personel yang di-tap di "Daftar Keterangan Absen" — semuanya dari list, tanpa fetch.
interface SelectedPerson {
  fullName: string;
  serviceNumber: string;
  photo?: string | null;
  status: AttendanceTab;
  reasonName?: string | null;
  note?: string | null;
}

const TAB_STATUS_META: Record<AttendanceTab, { label: string; variant: BadgeVariant }> = {
  present: { label: 'Hadir', variant: 'success' },
  absent: { label: 'Tidak Hadir', variant: 'warning' },
  unmarked: { label: 'Belum Ditandai', variant: 'neutral' },
};

type Modal =
  | { kind: 'confirm-close' }
  | { kind: 'result'; variant: 'success' | 'error'; title: string; message: string }
  | null;

export default function RollCallDetailScreen(props: Props) {
  const { navigation, route } = props;
  const { id } = route.params;

  const [detail, setDetail] = useState<RollCallDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<AttendanceTab>('absent');

  const [isInputSheetVisible, setIsInputSheetVisible] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<SelectedPerson | null>(null);
  const isFirstFocus = useRef(true);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') setIsLoading(true);
      if (mode === 'refresh') setIsRefreshing(true);
      setErrorMessage(null);
      try {
        setDetail(await getRollCallDetailApi(id));
      } catch (error) {
        setErrorMessage(extractErrorMessage(error, 'Gagal memuat detail sesi apel.'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      load(isFirstFocus.current ? 'initial' : 'refresh');
      isFirstFocus.current = false;
    }, [load]),
  );

  function chooseStatus(status: RollCallEntryStatus) {
    setIsInputSheetVisible(false);
    // Langsung ke halaman cari personel; scan QR diakses dari ikon di header layar itu.
    navigation.navigate(ROUTES.rollCallSearch, { sessionId: id, status });
  }

  async function confirmClose() {
    setIsClosing(true);
    try {
      await closeRollCallApi(id);
      await load('refresh');
      setModal({
        kind: 'result',
        variant: 'success',
        title: 'Sesi Ditutup',
        message: 'Sesi kekuatan apel berhasil dikunci. Kehadiran tidak dapat diubah lagi.',
      });
    } catch (error) {
      setModal({
        kind: 'result',
        variant: 'error',
        title: 'Gagal Menutup Sesi',
        message: extractErrorMessage(error, 'Terjadi kesalahan saat menutup sesi apel.'),
      });
    } finally {
      setIsClosing(false);
    }
  }

  const session = detail?.session;
  const recap = detail?.recap;
  const isOpen = session?.status === 'open';

  const tabCounts: Record<AttendanceTab, number> = {
    present: detail?.present.length ?? 0,
    absent: detail?.absent.length ?? 0,
    unmarked: detail?.unmarked.length ?? 0,
  };

  return (
    <MainLayout
      title={session?.name ?? 'Sesi Apel'}
      subtitle={session ? `${rollCallDateLong(session.date)} · ${rollCallTimeLabel(session.time)} WIB` : undefined}
      variant="canvas"
      onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : !detail || !recap ? (
        <Text style={styles.empty}>{errorMessage ?? 'Data tidak ditemukan.'}</Text>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => load('refresh')} tintColor={colors.primary} />
          }>
          <Card style={styles.card}>
            <View style={styles.statusHeader}>
              <Text style={styles.cardTitle}>Status Sesi</Text>
              <Badge label={isOpen ? 'Buka' : 'Ditutup'} variant={isOpen ? 'primary' : 'neutral'} />
            </View>
            <InfoRow icon="calendar" label="Tanggal" value={rollCallDateLong(session!.date)} />
            <InfoRow icon="clock" label="Waktu" value={`${rollCallTimeLabel(session!.time)} WIB`} />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionLabel}>REKAP KEHADIRAN</Text>
            <View style={styles.percentRow}>
              <Text style={[styles.percent, { color: attendanceColor(recap.percentage) }]}>
                {String(recap.percentage).replace('.', ',')}%
              </Text>
              <Text style={styles.percentMeta}>
                {recap.present} dari {recap.total} personel hadir
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(0, Math.min(100, recap.percentage))}%`, backgroundColor: attendanceColor(recap.percentage) },
                ]}
              />
            </View>
            <View style={styles.statTiles}>
              <StatTile label="Hadir" value={recap.present} color={colors.success} />
              <StatTile label="Tidak Hadir" value={recap.absent} color={colors.danger} />
              <StatTile label="Belum" value={recap.unmarked} color={colors.placeholder} />
            </View>
            {detail.breakdown.length > 0 ? (
              <>
                <Text style={[styles.sectionLabel, styles.breakdownLabel]}>RINCIAN KETIDAKHADIRAN</Text>
                <View style={styles.breakdownRow}>
                  {detail.breakdown.map(item => (
                    <View key={item.name} style={styles.breakdownChip}>
                      <Text style={styles.breakdownChipText}>
                        {item.name} · {item.count}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </Card>

          {isOpen ? (
            <View style={styles.actionRow}>
              <PressableScale
                scaleTo={0.97}
                onPress={() => setIsInputSheetVisible(true)}
                style={styles.actionFlex}
                contentStyle={styles.primaryAction}>
                <Icon name="clipboard-check" size={18} color={colors.primaryForeground} />
                <Text style={styles.primaryActionText}>Input Absen</Text>
              </PressableScale>
              <PressableScale
                scaleTo={0.97}
                onPress={() => setModal({ kind: 'confirm-close' })}
                style={styles.actionFlex}
                contentStyle={styles.secondaryAction}>
                <Icon name="lock" size={17} color={colors.danger} />
                <Text style={styles.secondaryActionText}>Tutup Sesi</Text>
              </PressableScale>
            </View>
          ) : (
            <View style={styles.closedNote}>
              <Icon name="lock" size={15} color={colors.textMuted} />
              <Text style={styles.closedNoteText}>Sesi sudah ditutup — kehadiran tidak dapat diubah.</Text>
            </View>
          )}

          <View style={styles.listHeader}>
            <Text style={styles.sectionLabel}>DAFTAR KETERANGAN ABSEN</Text>
            <Text style={styles.listHeaderMeta}>{recap.total} personel</Text>
          </View>

          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: 'present', label: `Hadir · ${tabCounts.present}`, icon: 'check' },
              { value: 'absent', label: `Absen · ${tabCounts.absent}`, icon: 'close' },
              { value: 'unmarked', label: `Belum · ${tabCounts.unmarked}`, icon: 'clock' },
            ]}
          />

          <View style={styles.entryList}>
            {tab === 'present'
              ? detail.present.map(entry => (
                  <EntryRow
                    key={entry.id}
                    name={entry.personnel.full_name}
                    serviceNumber={entry.personnel.service_number}
                    photo={entry.personnel.photo}
                    tone="present"
                    badge={{ label: 'Hadir', variant: 'success' }}
                    onPress={() =>
                      setSelectedPerson({
                        fullName: entry.personnel.full_name,
                        serviceNumber: entry.personnel.service_number,
                        photo: entry.personnel.photo,
                        status: 'present',
                      })
                    }
                  />
                ))
              : null}
            {tab === 'absent'
              ? detail.absent.map(entry => (
                  <EntryRow
                    key={entry.id}
                    name={entry.personnel.full_name}
                    serviceNumber={entry.personnel.service_number}
                    photo={entry.personnel.photo}
                    tone="absent"
                    badge={{
                      label: entry.absence_reason?.name ?? entry.note ?? 'Tidak Hadir',
                      variant: 'warning',
                    }}
                    onPress={() =>
                      setSelectedPerson({
                        fullName: entry.personnel.full_name,
                        serviceNumber: entry.personnel.service_number,
                        photo: entry.personnel.photo,
                        status: 'absent',
                        reasonName: entry.absence_reason?.name ?? null,
                        note: entry.note,
                      })
                    }
                  />
                ))
              : null}
            {tab === 'unmarked'
              ? detail.unmarked.map(person => (
                  <EntryRow
                    key={person.id}
                    name={person.full_name}
                    serviceNumber={person.service_number}
                    photo={person.photo}
                    tone="unmarked"
                    badge={{ label: 'Belum', variant: 'neutral' }}
                    onPress={() =>
                      setSelectedPerson({
                        fullName: person.full_name,
                        serviceNumber: person.service_number,
                        photo: person.photo,
                        status: 'unmarked',
                      })
                    }
                  />
                ))
              : null}
            {tabCounts[tab] === 0 ? (
              <Text style={styles.entryEmpty}>Belum ada data pada kategori ini.</Text>
            ) : null}
          </View>
        </ScrollView>
      )}

      <BottomSheet visible={isInputSheetVisible} onRequestClose={() => setIsInputSheetVisible(false)}>
        <Text style={styles.sheetTitle}>Input Absen</Text>
        <Text style={styles.sheetSubtitle}>Pilih jenis kehadiran yang akan dicatat</Text>
        <View style={styles.sheetChoices}>
          <ChoiceRow
            icon="check"
            iconColor={colors.success}
            iconSurface={colors.successSurface}
            title="Tandai Hadir"
            subtitle="Catat personel yang mengikuti apel"
            onPress={() => chooseStatus('present')}
          />
          <ChoiceRow
            icon="alert-triangle"
            iconColor={colors.danger}
            iconSurface={colors.dangerSurface}
            title="Tandai Tidak Hadir"
            subtitle="Catat personel absen beserta keterangannya"
            onPress={() => chooseStatus('absent')}
          />
        </View>
      </BottomSheet>

      <BottomSheet visible={selectedPerson !== null} onRequestClose={() => setSelectedPerson(null)}>
        {selectedPerson ? (
          <View style={styles.personSheet}>
            <View style={styles.personSheetHead}>
              <ToneAvatar
                photo={selectedPerson.photo}
                name={selectedPerson.fullName}
                tone={selectedPerson.status}
                style={styles.personSheetAvatar}
              />
              <View style={styles.personSheetIdentity}>
                <Text style={styles.personSheetName}>{selectedPerson.fullName}</Text>
                <Text style={styles.personSheetMeta}>NRP {selectedPerson.serviceNumber}</Text>
              </View>
            </View>

            <View style={styles.personSheetRows}>
              <InfoRow
                icon="clipboard-check"
                label="Status"
                value={TAB_STATUS_META[selectedPerson.status].label}
              />
              {selectedPerson.status === 'absent' ? (
                <InfoRow
                  icon="flag"
                  label="Keterangan"
                  value={selectedPerson.reasonName ?? 'Tanpa keterangan'}
                />
              ) : null}
            </View>

            {selectedPerson.status === 'absent' && selectedPerson.note ? (
              <View style={styles.personSheetNote}>
                <Text style={styles.personSheetNoteLabel}>Catatan</Text>
                <Text style={styles.personSheetNoteText}>{selectedPerson.note}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </BottomSheet>

      <StatusModal
        visible={modal?.kind === 'confirm-close'}
        variant="error"
        icon="error"
        title="Tutup Sesi Apel?"
        message={
          recap && recap.unmarked > 0
            ? `Setelah ditutup, kehadiran tidak dapat diubah lagi. ${recap.unmarked} personel masih belum ditandai.`
            : 'Setelah ditutup, kehadiran tidak dapat diubah lagi.'
        }
        onRequestClose={() => setModal(null)}
        primaryAction={{
          label: 'Tutup Sesi',
          onPress: () => {
            setModal(null);
            confirmClose();
          },
        }}
        secondaryAction={{ label: 'Batal', onPress: () => setModal(null) }}
      />

      <StatusModal
        visible={modal?.kind === 'result'}
        variant={modal?.kind === 'result' ? modal.variant : 'success'}
        title={modal?.kind === 'result' ? modal.title : ''}
        message={modal?.kind === 'result' ? modal.message : ''}
        onRequestClose={() => setModal(null)}
        primaryAction={{ label: 'Tutup', onPress: () => setModal(null) }}
      />

      {isClosing ? (
        <View style={styles.blockingLoader} pointerEvents="auto">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </MainLayout>
  );
}

function InfoRow(props: { icon: Parameters<typeof Icon>[0]['name']; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Icon name={props.icon} size={16} color={colors.textMuted} />
      <Text style={styles.infoLabel}>{props.label}</Text>
      <Text style={styles.infoValue}>{props.value}</Text>
    </View>
  );
}

function StatTile(props: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statTileLabel, { color: props.color }]}>{props.label.toUpperCase()}</Text>
      <Text style={styles.statTileValue}>{props.value}</Text>
    </View>
  );
}

const AVATAR_TONE: Record<'present' | 'absent' | 'unmarked', [string, string]> = {
  present: [colors.gradientSuccessStart, colors.success],
  absent: [colors.gradientDangerStart, colors.danger],
  unmarked: [colors.gradientInactiveStart, colors.gradientInactiveEnd],
};

// Avatar ber-tone status (present/absent/unmarked) — foto asli kalau ada & bisa ditampilkan,
// jatuh ke inisial ber-tone kalau tidak.
function ToneAvatar(props: {
  photo?: string | null;
  name: string;
  tone: 'present' | 'absent' | 'unmarked';
  style?: object;
}) {
  const { photo, name, tone, style } = props;
  const [failed, setFailed] = useState(false);

  if (isDisplayablePhoto(photo) && !failed) {
    return <SecureImage path={photo ?? null} style={[styles.avatar, styles.avatarImage, style]} onLoadError={() => setFailed(true)} />;
  }
  return (
    <View style={[styles.avatar, { backgroundColor: AVATAR_TONE[tone][0] }, style]}>
      <Text style={styles.avatarText}>{(name.charAt(0) || '?').toUpperCase()}</Text>
    </View>
  );
}

function EntryRow(props: {
  name: string;
  serviceNumber: string;
  photo?: string | null;
  tone: 'present' | 'absent' | 'unmarked';
  badge: { label: string; variant: BadgeVariant };
  onPress: () => void;
}) {
  return (
    <PressableScale scaleTo={0.98} onPress={props.onPress}>
      <Card style={styles.entryCard}>
        <ToneAvatar photo={props.photo} name={props.name} tone={props.tone} />
        <View style={styles.entryBody}>
          <Text style={styles.entryName} numberOfLines={1}>
            {props.name}
          </Text>
          <Text style={styles.entryMeta} numberOfLines={1}>
            NRP {props.serviceNumber}
          </Text>
        </View>
        <Badge label={props.badge.label} variant={props.badge.variant} />
        <Icon name="chevron-right" size={16} color={colors.placeholder} />
      </Card>
    </PressableScale>
  );
}

function ChoiceRow(props: {
  icon: Parameters<typeof Icon>[0]['name'];
  iconColor: string;
  iconSurface: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <PressableScale scaleTo={0.98} onPress={props.onPress} contentStyle={styles.choice}>
      <View style={[styles.choiceIcon, { backgroundColor: props.iconSurface }]}>
        <Icon name={props.icon} size={22} color={props.iconColor} />
      </View>
      <View style={styles.choiceBody}>
        <Text style={styles.choiceTitle}>{props.title}</Text>
        <Text style={styles.choiceSubtitle}>{props.subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={18} color={colors.placeholder} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 48 },
  empty: { marginTop: 32, textAlign: 'center', fontSize: 14, color: colors.textMuted },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 120, gap: 16 },
  card: { gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.heading },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { flex: 1, fontSize: 13, color: colors.textMuted },
  infoValue: { fontSize: 13, fontWeight: '600', color: colors.heading, textAlign: 'right' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.primary, letterSpacing: 0.4 },
  percentRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  percent: { fontSize: 34, fontWeight: '800', letterSpacing: -1, lineHeight: 36 },
  percentMeta: { fontSize: 12, color: colors.textMuted, paddingBottom: 4 },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: colors.chipSurface, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  statTiles: { flexDirection: 'row', gap: 10 },
  statTile: { flex: 1, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 14, padding: 10, gap: 2 },
  statTileLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  statTileValue: { fontSize: 18, fontWeight: '800', color: colors.heading },
  breakdownLabel: { fontSize: 12, marginTop: 4 },
  breakdownRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  breakdownChip: {
    backgroundColor: colors.warningSurface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  breakdownChipText: { fontSize: 11, fontWeight: '700', color: colors.warningText, textTransform: 'uppercase' },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionFlex: { flex: 1 },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 999,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  primaryActionText: { fontSize: 15, fontWeight: '700', color: colors.primaryForeground },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  secondaryActionText: { fontSize: 14, fontWeight: '600', color: colors.danger },
  closedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.neutralSurface,
    borderRadius: 14,
    padding: 12,
  },
  closedNoteText: { fontSize: 12, color: colors.textMuted, flex: 1 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listHeaderMeta: { fontSize: 12, color: colors.textMuted },
  entryList: { gap: 12 },
  entryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  entryBody: { flex: 1, gap: 2 },
  entryName: { fontSize: 15, fontWeight: '700', color: colors.heading },
  entryMeta: { fontSize: 12, color: colors.textMuted },
  entryEmpty: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { backgroundColor: colors.neutralSurface },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primaryForeground },
  personSheet: { paddingBottom: 12, gap: 16 },
  personSheetHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  personSheetAvatar: { width: 52, height: 52, borderRadius: 26 },
  personSheetIdentity: { flex: 1, gap: 3 },
  personSheetName: { fontSize: 17, fontWeight: '800', color: colors.heading },
  personSheetMeta: { fontSize: 13, color: colors.textMuted },
  personSheetNote: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 4,
  },
  personSheetNoteLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  personSheetNoteText: { fontSize: 14, color: colors.heading, lineHeight: 20 },
  personSheetRows: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.heading },
  sheetSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2, marginBottom: 16 },
  sheetChoices: { gap: 12, paddingBottom: 8 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  choiceIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  choiceBody: { flex: 1, gap: 2 },
  choiceTitle: { fontSize: 15, fontWeight: '700', color: colors.heading },
  choiceSubtitle: { fontSize: 12, color: colors.textMuted },
  blockingLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
});
