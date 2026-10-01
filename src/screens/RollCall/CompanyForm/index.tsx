import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import Badge from '@/components/atoms/Badge';
import GradientAvatar from '@/components/atoms/GradientAvatar';
import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import TextField from '@/components/atoms/TextField';
import SearchFilterBar from '@/components/molecules/SearchFilterBar';
import SegmentedControl from '@/components/molecules/SegmentedControl';
import StatDividerRow from '@/components/molecules/StatDividerRow';
import BottomSheet from '@/components/organisms/BottomSheet';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  getAbsenceReasonsApi,
  getRollCallCompanyFormApi,
  submitRollCallCompanyApi,
} from '@/services/api/rollCall.service';
import { colors } from '@/theme/colors';
import type {
  RollCallCompanyForm,
  RollCallFormMember,
  RollCallMode,
  RollCallReasonChoice,
} from '@/types';
import { cleanValue, extractErrorMessage, joinFields } from '@/utils/format';
import { attendanceColor, initialsOf, rollCallDateLabel } from '@/utils/rollCall';
import { ProgressBar, sharedStyles } from '@/screens/RollCall/shared';

type Props = RootStackScreenProps<typeof ROUTES.rollCallCompanyForm>;

interface Mark {
  // null = belum diisi → ikut mode (Catat Tidak Hadir: dianggap hadir; Catat Hadir: tidak hadir).
  present: boolean | null;
  reason: RollCallReasonChoice | null;
  other: string;
  note: string;
}

interface ReasonOption {
  id: RollCallReasonChoice;
  name: string;
  description: string | null;
}

type ListItem =
  | { type: 'group'; key: string; label: string }
  | { type: 'member'; key: string; member: RollCallFormMember; first: boolean; last: boolean };

type Modal =
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }
  | null;

const LAINNYA = 'lainnya';

const MODE_OPTIONS: { value: RollCallMode; label: string; icon: 'user-x' | 'user-check' }[] = [
  { value: 'absent', label: 'Catat Tidak Hadir', icon: 'user-x' },
  { value: 'present', label: 'Catat Hadir', icon: 'user-check' },
];

function initialMark(member: RollCallFormMember): Mark {
  const other = cleanValue(member.absence_reason_other) ?? '';
  return {
    present: member.present,
    reason: member.absence_reason_id ?? (other ? LAINNYA : null),
    other,
    note: cleanValue(member.note) ?? '',
  };
}

function isPresent(mark: Mark | undefined, mode: RollCallMode): boolean {
  return mark?.present ?? mode === 'absent';
}

function hasValidReason(mark: Mark | undefined): boolean {
  if (!mark || mark.reason == null) return false;
  return mark.reason !== LAINNYA || mark.other.trim() !== '';
}

// Isi kehadiran satu kompi (GET/POST /roll-calls/agenda/{agenda}/companies/{unit}). Dua mode
// pencatatan hanya mengubah titik awal; yang dikirim selalu daftar yang HADIR + alasan untuk
// setiap yang tidak hadir (wajib).
export default function RollCallCompanyFormScreen(props: Props) {
  const { navigation, route } = props;
  const { agendaId, unitId, companyName } = route.params;
  const keyboardHeight = useKeyboardHeight();

  const [form, setForm] = useState<RollCallCompanyForm | null>(null);
  const [reasonOptions, setReasonOptions] = useState<ReasonOption[]>([]);
  const [mode, setMode] = useState<RollCallMode>('absent');
  const [marks, setMarks] = useState<Record<number, Mark>>({});
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState<Modal>(null);

  const [sheetFor, setSheetFor] = useState<number | null>(null);
  const [draftReason, setDraftReason] = useState<RollCallReasonChoice | null>(null);
  const [draftOther, setDraftOther] = useState('');
  const [draftNote, setDraftNote] = useState('');

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const marksRef = useRef(marks);
  marksRef.current = marks;

  const load = useCallback(async () => {
    setLoadError(null);
    const [formResult, reasonsResult] = await Promise.allSettled([
      getRollCallCompanyFormApi(agendaId, unitId),
      getAbsenceReasonsApi(),
    ]);
    if (formResult.status === 'rejected') {
      setLoadError(extractErrorMessage(formResult.reason, 'Gagal memuat daftar anggota kompi.'));
      setIsLoading(false);
      return;
    }
    const nextForm = formResult.value;
    const labels = reasonsResult.status === 'fulfilled' ? reasonsResult.value : [];
    const base = nextForm.absence_reason.length > 0 ? nextForm.absence_reason : labels;
    setReasonOptions([
      ...base.map(reason => ({
        id: reason.id,
        name: reason.name,
        description: labels.find(label => label.id === reason.id)?.note_label ?? null,
      })),
      { id: LAINNYA, name: 'Lainnya', description: 'Tulis alasan sendiri bila tidak ada di daftar' },
    ]);
    setForm(nextForm);
    setMode(nextForm.saved_mode ?? 'absent');
    setMarks(Object.fromEntries(nextForm.members.map(member => [member.personnel_id, initialMark(member)])));
    setIsLoading(false);
  }, [agendaId, unitId]);

  useEffect(() => {
    load();
  }, [load]);

  const locked = !!form?.agenda.is_locked;
  const members = useMemo(() => form?.members ?? [], [form]);

  const counts = useMemo(() => {
    let present = 0;
    let missing = 0;
    members.forEach(member => {
      const mark = marks[member.personnel_id];
      if (isPresent(mark, mode)) present += 1;
      else if (!hasValidReason(mark)) missing += 1;
    });
    const total = members.length;
    return {
      total,
      present,
      absent: total - present,
      missing,
      percent: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  }, [members, marks, mode]);

  const listItems = useMemo<ListItem[]>(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? members.filter(
          member => member.name.toLowerCase().includes(q) || (member.nrp ?? '').toLowerCase().includes(q),
        )
      : members;
    const groups: { label: string; items: RollCallFormMember[] }[] = [];
    filtered.forEach(member => {
      const label = cleanValue(member.unit) ?? form?.company.name ?? 'Anggota';
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(member);
      else groups.push({ label, items: [member] });
    });
    const items: ListItem[] = [];
    groups.forEach(group => {
      items.push({ type: 'group', key: `g-${group.label}`, label: `${group.label} · ${group.items.length}` });
      group.items.forEach((member, index) =>
        items.push({
          type: 'member',
          key: `m-${member.personnel_id}`,
          member,
          first: index === 0,
          last: index === group.items.length - 1,
        }),
      );
    });
    return items;
  }, [members, query, form]);

  const openSheet = useCallback((personnelId: number) => {
    const mark = marksRef.current[personnelId];
    setSheetFor(personnelId);
    setDraftReason(mark?.reason ?? null);
    setDraftOther(mark?.other ?? '');
    setDraftNote(mark?.note ?? '');
  }, []);

  const toggle = useCallback(
    (personnelId: number) => {
      const current = marksRef.current[personnelId];
      if (isPresent(current, modeRef.current)) {
        setMarks(previous => ({
          ...previous,
          [personnelId]: { ...(previous[personnelId] ?? initialMarkEmpty()), present: false },
        }));
        // Di mode "Catat Tidak Hadir", menandai anggota langsung membuka pilihan alasan.
        if (modeRef.current === 'absent') openSheet(personnelId);
      } else {
        setMarks(previous => ({
          ...previous,
          [personnelId]: { present: true, reason: null, other: '', note: '' },
        }));
      }
    },
    [openSheet],
  );

  function closeSheet() {
    setSheetFor(null);
  }

  const draftValid = draftReason != null && (draftReason !== LAINNYA || draftOther.trim() !== '');

  function saveDraft() {
    if (sheetFor == null || !draftValid) return;
    const personnelId = sheetFor;
    setMarks(previous => ({
      ...previous,
      [personnelId]: {
        present: false,
        reason: draftReason,
        other: draftReason === LAINNYA ? draftOther.trim() : '',
        note: draftNote.trim(),
      },
    }));
    setSheetFor(null);
  }

  async function handleSubmit() {
    if (!form || counts.missing > 0) return;
    const present: number[] = [];
    const reasons: Record<number, RollCallReasonChoice> = {};
    const reasonOthers: Record<number, string> = {};
    const notes: Record<number, string> = {};
    members.forEach(member => {
      const id = member.personnel_id;
      const mark = marks[id];
      if (isPresent(mark, mode)) {
        present.push(id);
        return;
      }
      if (mark?.reason != null) reasons[id] = mark.reason;
      if (mark?.reason === LAINNYA && mark.other) reasonOthers[id] = mark.other;
      if (mark?.note) notes[id] = mark.note;
    });

    setIsSubmitting(true);
    try {
      const result = await submitRollCallCompanyApi(agendaId, unitId, { mode, present, reasons, reasonOthers, notes });
      setForm(previous => (previous ? { ...previous, is_submitted: true } : previous));
      const progress =
        result.total_companies > 0
          ? ` ${result.submitted_companies} dari ${result.total_companies} kompi sudah mengirim.`
          : '';
      setModal({ kind: 'success', message: `${result.message}${progress}` });
    } catch (error) {
      setModal({ kind: 'error', message: extractErrorMessage(error, 'Apel kompi gagal dikirim.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Saat sheet alasan terbuka, keyboard mengangkat isi sheet — bukan daftar di belakangnya.
  const listBottomInset = sheetFor == null ? keyboardHeight : 0;
  const sheetMember = sheetFor != null ? members.find(member => member.personnel_id === sheetFor) : null;
  const reasonName = (choice: RollCallReasonChoice | null) =>
    reasonOptions.find(option => option.id === choice)?.name ?? null;

  const subtitle = form
    ? joinFields(companyName ?? form.company.name, `${form.agenda.session}, ${rollCallDateLabel(form.agenda.date)}`)
    : companyName;

  const header = form ? (
    <View style={styles.headerBlock}>
      <View style={styles.statusStrip}>
        {locked ? (
          <Badge label="TERKUNCI" variant="neutral" icon="lock" />
        ) : form.is_submitted ? (
          <Badge label="TERKIRIM" variant="success" />
        ) : (
          <Badge label="BELUM DIKIRIM" variant="neutral" />
        )}
        <Text style={styles.statusText}>
          {locked
            ? 'Agenda terkunci, isian tidak bisa diubah.'
            : form.is_submitted
              ? 'Perbaikan masih bisa dikirim ulang.'
              : 'Bisa dikirim ulang selama agenda belum terkunci.'}
        </Text>
      </View>

      {!locked ? (
        <>
          <Text style={styles.modeLabel}>Cara pencatatan</Text>
          <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />
          <Text style={styles.modeHelp}>
            {mode === 'absent'
              ? 'Semua anggota dianggap hadir. Tandai yang tidak hadir, lalu pilih alasannya.'
              : 'Tandai anggota yang hadir. Yang tidak ditandai dianggap tidak hadir dan wajib diberi alasan.'}
          </Text>
        </>
      ) : null}

      <View style={[sharedStyles.cardRaised, styles.summary]}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Hadir</Text>
            <Text style={styles.summaryCount}>
              {counts.present}
              <Text style={styles.summaryTotal}>/{counts.total}</Text>
            </Text>
          </View>
          <Text style={[styles.summaryPercent, { color: attendanceColor(counts.percent) }]}>{counts.percent}%</Text>
        </View>
        <ProgressBar percent={counts.percent} height={6} />
        <StatDividerRow
          size="md"
          style={styles.summaryStats}
          items={[
            { label: 'Anggota', value: String(counts.total) },
            { label: 'Tidak Hadir', value: String(counts.absent), flex: 1.1 },
            {
              label: 'Belum beralasan',
              value: String(counts.missing),
              valueColor: counts.missing > 0 ? colors.warningText : undefined,
              flex: 1.3,
            },
          ]}
        />
      </View>

      <SearchFilterBar
        value={query}
        onChangeText={setQuery}
        onClear={() => setQuery('')}
        placeholder="Cari nama atau NRP"
        style={styles.search}
      />
    </View>
  ) : null;

  return (
    <MainLayout title="Isi Kehadiran" subtitle={subtitle} variant="canvas" onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={sharedStyles.loader} color={colors.primary} />
      ) : !form ? (
        <Text style={sharedStyles.empty}>{loadError ?? 'Data kompi tidak ditemukan.'}</Text>
      ) : (
        <View style={[sharedStyles.flex, { paddingBottom: listBottomInset }]}>
          <FlatList
            data={listItems}
            keyExtractor={item => item.key}
            ListHeaderComponent={header ?? undefined}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            initialNumToRender={20}
            ListEmptyComponent={<Text style={sharedStyles.empty}>Tidak ada anggota yang cocok.</Text>}
            renderItem={({ item }) => {
              if (item.type === 'group') return <Text style={styles.groupLabel}>{item.label}</Text>;
              const mark = marks[item.member.personnel_id];
              const present = isPresent(mark, mode);
              const validReason = hasValidReason(mark);
              let reasonText: string | null = null;
              if (!present && validReason) {
                const base = mark?.reason === LAINNYA ? mark.other : reasonName(mark?.reason ?? null);
                reasonText = joinFields(base, mark?.note) || null;
              }
              return (
                <MemberRow
                  member={item.member}
                  present={present}
                  checked={mode === 'absent' ? !present : present}
                  mode={mode}
                  locked={locked}
                  reasonText={reasonText}
                  first={item.first}
                  last={item.last}
                  onToggle={toggle}
                  onOpenReason={openSheet}
                />
              );
            }}
          />

          <View style={sharedStyles.footer}>
            {locked ? (
              <View style={styles.lockedFooter}>
                <Icon name="lock" size={16} color={colors.textMuted} />
                <Text style={styles.lockedFooterText}>Agenda terkunci, isian tidak bisa diubah</Text>
              </View>
            ) : (
              <>
                {counts.missing > 0 ? (
                  <View style={styles.footHintRow}>
                    <Icon name="alert-triangle" size={14} color={colors.warningText} />
                    <Text style={sharedStyles.footerWarn}>
                      {counts.missing} anggota tidak hadir belum diberi alasan
                    </Text>
                  </View>
                ) : (
                  <Text style={sharedStyles.footerHint}>
                    {counts.present} hadir · {counts.absent} tidak hadir akan dikirim
                  </Text>
                )}
                <GradientButton
                  label={form.is_submitted ? 'Kirim Perbaikan' : 'Kirim Apel Kompi'}
                  icon="send"
                  loading={isSubmitting}
                  disabled={counts.missing > 0 || isSubmitting}
                  onPress={handleSubmit}
                />
              </>
            )}
          </View>
        </View>
      )}

      <BottomSheet visible={sheetFor != null} onRequestClose={closeSheet}>
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={{ paddingBottom: keyboardHeight }}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.sheetTitle}>Alasan Tidak Hadir</Text>
          {sheetMember ? (
            <Text style={styles.sheetSub}>
              {joinFields(sheetMember.name, sheetMember.rank, sheetMember.nrp)}
            </Text>
          ) : null}
          <View style={styles.reasonList}>
            {reasonOptions.map(option => {
              const active = option.id === draftReason;
              return (
                <PressableScale
                  key={String(option.id)}
                  scaleTo={0.98}
                  onPress={() => setDraftReason(option.id)}
                  accessibilityState={{ selected: active }}
                  contentStyle={[styles.reasonOption, active && styles.reasonOptionActive]}>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>
                  <View style={styles.reasonBody}>
                    <Text style={styles.reasonName}>{option.name}</Text>
                    {option.description ? <Text style={styles.reasonDesc}>{option.description}</Text> : null}
                  </View>
                </PressableScale>
              );
            })}
          </View>
          {draftReason === LAINNYA ? (
            <TextField
              label="Tulis alasan (wajib)"
              placeholder="Mis. mengantar orang tua berobat"
              value={draftOther}
              onChangeText={setDraftOther}
              containerStyle={styles.sheetField}
            />
          ) : null}
          <TextField
            label="Catatan (opsional)"
            placeholder="Mis. dirawat di Kesdam"
            value={draftNote}
            onChangeText={setDraftNote}
            containerStyle={styles.sheetField}
          />
          <View style={styles.sheetActions}>
            <PressableScale onPress={closeSheet} style={sharedStyles.flex} contentStyle={styles.sheetCancel}>
              <Text style={styles.sheetCancelText}>Batal</Text>
            </PressableScale>
            <GradientButton
              label="Simpan Alasan"
              height={52}
              disabled={!draftValid}
              onPress={saveDraft}
              style={sharedStyles.flex}
            />
          </View>
        </ScrollView>
      </BottomSheet>

      <StatusModal
        visible={modal !== null}
        variant={modal?.kind === 'error' ? 'error' : 'success'}
        title={modal?.kind === 'error' ? 'Gagal Mengirim' : 'Apel kompi terkirim'}
        message={modal?.message ?? ''}
        onRequestClose={() => setModal(null)}
        secondaryAction={
          modal?.kind === 'success'
            ? {
                label: 'Lihat Isian',
                onPress: () => {
                  setModal(null);
                  load();
                },
              }
            : undefined
        }
        primaryAction={
          modal?.kind === 'success'
            ? {
                label: 'Ke Agenda',
                onPress: () => {
                  setModal(null);
                  navigation.goBack();
                },
              }
            : { label: 'Tutup', onPress: () => setModal(null) }
        }
      />
    </MainLayout>
  );
}

function initialMarkEmpty(): Mark {
  return { present: null, reason: null, other: '', note: '' };
}

interface MemberRowProps {
  member: RollCallFormMember;
  present: boolean;
  checked: boolean;
  mode: RollCallMode;
  locked: boolean;
  reasonText: string | null;
  first: boolean;
  last: boolean;
  onToggle: (personnelId: number) => void;
  onOpenReason: (personnelId: number) => void;
}

const MemberRow = memo(function MemberRowImpl(props: MemberRowProps) {
  const { member, present, checked, mode, locked, reasonText, first, last, onToggle, onOpenReason } = props;
  const tone = mode === 'absent' ? colors.warning : colors.success;

  const identity = (
    <>
      <GradientAvatar
        label={initialsOf(member.name)}
        gradientStart={present ? colors.gradientPrimaryStart : colors.gradientWarnStart}
        gradientEnd={present ? colors.gradientPrimaryEnd : colors.warning}
        size={40}
      />
      <View style={styles.memberBody}>
        <Text style={sharedStyles.rowTitle} numberOfLines={1}>
          {member.name}
        </Text>
        <Text style={sharedStyles.rowMeta} numberOfLines={1}>
          {joinFields(member.rank, member.nrp) || '-'}
        </Text>
      </View>
    </>
  );

  return (
    <View
      style={[
        styles.memberWrap,
        first && styles.memberFirst,
        last && styles.memberLast,
        !first && sharedStyles.listRowDivider,
      ]}>
      {locked ? (
        <View style={styles.memberRow}>
          {identity}
          {present ? (
            <Badge label="HADIR" variant="success" />
          ) : (
            <Badge label={(reasonText ?? 'Tidak hadir').toUpperCase()} variant="warning" style={styles.lockedBadge} />
          )}
        </View>
      ) : (
        <>
          <PressableScale
            scaleTo={0.98}
            onPress={() => onToggle(member.personnel_id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            contentStyle={styles.memberRow}>
            {identity}
            <View
              style={[
                styles.checkbox,
                checked ? { backgroundColor: tone, borderColor: tone } : styles.checkboxEmpty,
              ]}>
              {checked ? (
                <Icon name={mode === 'absent' ? 'close' : 'check'} size={15} color={colors.primaryForeground} />
              ) : null}
            </View>
          </PressableScale>
          {!present ? (
            <PressableScale
              onPress={() => onOpenReason(member.personnel_id)}
              style={styles.reasonPillWrap}
              contentStyle={[styles.reasonPill, reasonText ? styles.reasonPillSet : styles.reasonPillEmpty]}>
              <Text style={styles.reasonPillText} numberOfLines={1}>
                {reasonText ?? 'Pilih alasan'}
              </Text>
              <Icon name={reasonText ? 'edit' : 'chevron-down'} size={12} color={colors.warningText} />
            </PressableScale>
          ) : null}
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
  headerBlock: { paddingBottom: 4 },
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  statusText: { flex: 1, fontSize: 12, lineHeight: 16, color: colors.textMuted },
  modeLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6, marginLeft: 2 },
  modeHelp: { fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: 8, marginBottom: 14, marginLeft: 2 },
  summary: { paddingTop: 14, paddingBottom: 4 },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 },
  summaryCol: { gap: 2 },
  summaryLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  summaryCount: { fontSize: 28, fontWeight: '800', color: colors.heading, letterSpacing: -0.5, lineHeight: 32 },
  summaryTotal: { fontSize: 18, fontWeight: '700', color: colors.placeholder },
  summaryPercent: { fontSize: 16, fontWeight: '800' },
  summaryStats: { marginTop: 14 },
  search: { marginTop: 16 },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 2,
  },
  memberWrap: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  memberFirst: { borderTopWidth: 1, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  memberLast: { borderBottomWidth: 1, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberBody: { flex: 1, minWidth: 0, gap: 2 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxEmpty: { borderColor: colors.dividerOnGradient, backgroundColor: colors.surface },
  lockedBadge: { maxWidth: 150 },
  reasonPillWrap: { alignSelf: 'flex-start', marginTop: 8, marginLeft: 52, maxWidth: 260 },
  reasonPill: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  reasonPillEmpty: { borderStyle: 'dashed', borderColor: colors.warning, backgroundColor: colors.surface },
  reasonPillSet: { borderColor: colors.warningSurface, backgroundColor: colors.warningSurface },
  reasonPillText: { flexShrink: 1, fontSize: 12, fontWeight: '600', color: colors.warningText },
  footHintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  lockedFooter: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  lockedFooterText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  sheetScroll: { maxHeight: 620 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.heading },
  sheetSub: { fontSize: 13, color: colors.textMuted, marginTop: 2, marginBottom: 14 },
  reasonList: { gap: 8 },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  reasonOptionActive: { backgroundColor: colors.notifUnreadSurface, borderColor: colors.notifUnreadBorder },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.dividerOnGradient,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderWidth: 2, borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: colors.primary },
  reasonBody: { flex: 1, gap: 2 },
  reasonName: { fontSize: 15, fontWeight: '600', color: colors.heading },
  reasonDesc: { fontSize: 12, color: colors.textMuted },
  sheetField: { marginTop: 14 },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  sheetCancel: {
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  sheetCancelText: { fontSize: 15, fontWeight: '600', color: colors.heading },
});
