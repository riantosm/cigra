import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { CommonActions } from '@react-navigation/native';

import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import TextField from '@/components/atoms/TextField';
import DateTimeField from '@/components/molecules/DateTimeField';
import SegmentedControl from '@/components/molecules/SegmentedControl';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  createDispositionApi,
  getDispositionApi,
  updateDispositionApi,
} from '@/services/api/disposition.service';
import { colors } from '@/theme/colors';
import { smallButtonShadow, tabBarShadow } from '@/theme/shadows';
import type { CreateDispositionPayload, DispositionPriority, PersonnelSearchItem } from '@/types';
import { extractErrorMessage } from '@/utils/format';
import { PRIORITIES, priorityDotColor, priorityLabel, toApiDate } from '@/utils/disposition';

type Props = RootStackScreenProps<typeof ROUTES.dispositionCompose>;

export default function DispositionComposeScreen(props: Props) {
  const { navigation, route } = props;
  const editId = route.params?.dispositionId;
  const isEdit = editId != null;
  const keyboardHeight = useKeyboardHeight();

  // `letter` & `recipients` hidup di route.params (satu sumber kebenaran) supaya tetap utuh
  // apa pun arah navigasi masuk/keluar (pilih surat, cari penerima, edit draf).
  const letter = route.params?.incomingLetter ?? null;
  const recipients = route.params?.recipients ?? [];

  const [priority, setPriority] = useState<DispositionPriority>('normal');
  const [instruction, setInstruction] = useState('');
  const [note, setNote] = useState('');
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d;
  });

  const [isLoading, setIsLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [needsRepick, setNeedsRepick] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<'send' | 'draft' | null>(null);
  const [result, setResult] = useState<
    { variant: 'success' | 'error'; title: string; message: string } | null
  >(null);

  // Prefill saat edit draf.
  const loadDraft = useCallback(async () => {
    if (editId == null) return;
    setIsLoading(true);
    try {
      const detail = await getDispositionApi(editId);
      setInstruction(detail.instruction ?? '');
      setNote(detail.notes ?? '');
      if (detail.priority) setPriority(detail.priority);
      if (detail.deadline) {
        setHasDeadline(true);
        setDeadline(new Date(`${detail.deadline}T00:00:00`));
      }
      const seeded = detail.recipients
        .filter(r => r.personnel_id != null)
        .map<PersonnelSearchItem>(r => ({
          id: r.personnel_id as number,
          full_name: r.personnel_name,
          service_number: '',
        }));
      navigation.setParams({
        incomingLetter: {
          id: detail.incoming_letter.id,
          letter_number: detail.incoming_letter.reference_number,
          subject: detail.incoming_letter.subject,
        },
        recipients: seeded,
      });
      // Backend tidak selalu mengirim personnel_id di daftar penerima → minta pilih ulang.
      setNeedsRepick(seeded.length !== detail.recipients.length);
    } catch (error) {
      setLoadError(extractErrorMessage(error, 'Gagal memuat draf disposisi.'));
    } finally {
      setIsLoading(false);
    }
  }, [editId, navigation]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  // Begitu ada penerima terpilih (dari layar Cari & Pilih), reset penanda "pilih ulang".
  useEffect(() => {
    if (recipients.length > 0) setNeedsRepick(false);
  }, [recipients.length]);

  async function submit(action: 'send' | 'draft') {
    setFormError(null);
    if (!letter) {
      setFormError('Surat masuk belum dipilih.');
      return;
    }
    if (action === 'send' && recipients.length === 0) {
      setFormError('Pilih minimal satu penerima.');
      return;
    }
    if (needsRepick && recipients.length === 0) {
      setFormError('Pilih ulang daftar penerima sebelum menyimpan.');
      return;
    }
    if (!instruction.trim()) {
      setFormError('Instruksi disposisi wajib diisi.');
      return;
    }

    const payload: CreateDispositionPayload = {
      incoming_letter_id: letter.id,
      recipient_personnel_ids: recipients.map(r => r.id),
      priority,
      instruction: instruction.trim(),
      action_type: action,
      ...(hasDeadline ? { deadline: toApiDate(deadline) } : null),
      ...(note.trim() ? { note: note.trim() } : null),
    };

    setSubmitting(action);
    try {
      const res = isEdit
        ? await updateDispositionApi(editId as number, payload)
        : await createDispositionApi(payload);
      setResult({
        variant: 'success',
        title: action === 'draft' ? 'Draf Disimpan' : 'Disposisi Terkirim',
        message:
          action === 'draft'
            ? `Draf ${res.disposition_number ?? 'disposisi'} berhasil disimpan.`
            : `${res.disposition_number ?? 'Disposisi'} diteruskan ke ${recipients.length} penerima.`,
      });
    } catch (error) {
      setResult({
        variant: 'error',
        title: 'Gagal',
        message: extractErrorMessage(error, 'Gagal menyimpan disposisi.'),
      });
    } finally {
      setSubmitting(null);
    }
  }

  function handleResultClose() {
    const wasSuccess = result?.variant === 'success';
    setResult(null);
    if (!wasSuccess) return;
    // Sukses → buka detail surat ("Riwayat Disposisi" = "kotak keluar" komandan). Susun ulang
    // stack: layar Buat Disposisi (& langkah antara seperti Catat Surat) dibuang, jadi tombol
    // back dari detail kembali ke daftar Surat Masuk, bukan ke form.
    if (!letter) {
      navigation.navigate(ROUTES.incomingLetterList);
      return;
    }
    const state = navigation.getState();
    const listIdx = state.routes.findIndex(r => r.name === ROUTES.incomingLetterList);
    const base = (listIdx >= 0 ? state.routes.slice(0, listIdx + 1) : state.routes).map(r => ({
      name: r.name,
      params: r.params,
    }));
    navigation.dispatch(
      CommonActions.reset({
        index: base.length,
        routes: [
          ...base,
          { name: ROUTES.incomingLetterDetail, params: { id: letter.id } },
        ],
      }),
    );
  }

  if (isLoading) {
    return (
      <MainLayout title="Buat Disposisi" variant="canvas" onBack={() => navigation.goBack()}>
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      </MainLayout>
    );
  }

  if (loadError) {
    return (
      <MainLayout title="Buat Disposisi" variant="canvas" onBack={() => navigation.goBack()}>
        <Text style={styles.empty}>{loadError}</Text>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title={isEdit ? 'Ubah Draf Disposisi' : 'Buat Disposisi'}
      subtitle="Teruskan surat ke penerima"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <View style={[styles.flex, { paddingBottom: keyboardHeight }]}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            {/* Surat terpilih */}
            <View style={styles.block}>
              <Text style={styles.fieldLabel}>Surat Masuk</Text>
              {letter ? (
                <View style={styles.letterCard}>
                  <View style={styles.letterChip}>
                    <Icon name="file" size={16} color={colors.primary} />
                  </View>
                  <View style={styles.letterBody}>
                    <Text style={styles.letterCode}>{letter.letter_number}</Text>
                    <Text style={styles.letterSubject} numberOfLines={2}>
                      {letter.subject}
                    </Text>
                  </View>
                  {!isEdit ? (
                    <PressableScale
                      scaleTo={0.95}
                      onPress={() =>
                        navigation.navigate(ROUTES.incomingLetterList, { pickerMode: true })
                      }>
                      <Text style={styles.changeLink}>Ganti</Text>
                    </PressableScale>
                  ) : null}
                </View>
              ) : (
                <PressableScale
                  scaleTo={0.98}
                  onPress={() =>
                    navigation.navigate(ROUTES.incomingLetterList, { pickerMode: true })
                  }
                  contentStyle={styles.pickLetter}>
                  <Icon name="mail" size={16} color={colors.primary} />
                  <Text style={styles.pickLetterText}>Pilih surat masuk</Text>
                </PressableScale>
              )}
            </View>

            {/* Penerima */}
            <View style={styles.block}>
              <View style={styles.blockHead}>
                <Text style={styles.fieldLabel}>Penerima *</Text>
                <Text style={styles.countHint}>{recipients.length} penerima</Text>
              </View>
              {needsRepick ? (
                <Text style={styles.repickHint}>Pilih ulang daftar penerima untuk draf ini.</Text>
              ) : null}
              <View style={styles.chipRow}>
                {recipients.map(r => (
                  <View key={r.id} style={styles.recipientChip}>
                    <Text style={styles.recipientChipText} numberOfLines={1}>
                      {r.full_name}
                    </Text>
                  </View>
                ))}
                <PressableScale
                  scaleTo={0.95}
                  onPress={() =>
                    navigation.navigate(ROUTES.dispositionRecipientSearch, {
                      selectedIds: recipients.map(r => r.id),
                    })
                  }
                  contentStyle={styles.addRecipient}>
                  <Icon name="users" size={13} color={colors.primary} />
                  <Text style={styles.addRecipientText}>Cari &amp; Pilih</Text>
                </PressableScale>
              </View>
            </View>

            {/* Prioritas */}
            <View style={styles.block}>
              <Text style={styles.fieldLabel}>Prioritas *</Text>
              <SegmentedControl
                options={PRIORITIES.map(p => ({
                  value: p,
                  label: priorityLabel[p],
                  dotColor: priorityDotColor[p],
                }))}
                value={priority}
                onChange={setPriority}
              />
            </View>

            {/* Instruksi */}
            <View style={styles.block}>
              <Text style={styles.fieldLabel}>Instruksi *</Text>
              <TextField
                value={instruction}
                onChangeText={setInstruction}
                placeholder="Laksanakan sesuai SOP dan laporkan hasilnya..."
                multiline
                style={[styles.input, styles.textArea]}
              />
            </View>

            {/* Tenggat */}
            <View style={styles.block}>
              <View style={styles.blockHead}>
                <Text style={styles.fieldLabel}>Tenggat</Text>
                <Switch
                  value={hasDeadline}
                  onValueChange={setHasDeadline}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.surface}
                />
              </View>
              {hasDeadline ? (
                <DateTimeField
                  label="Batas penyelesaian"
                  mode="date"
                  value={deadline}
                  onChange={setDeadline}
                  minimumDate={new Date()}
                />
              ) : null}
            </View>

            {/* Catatan */}
            <View style={styles.block}>
              <Text style={styles.fieldLabel}>Catatan Tambahan</Text>
              <TextField
                value={note}
                onChangeText={setNote}
                placeholder="Catatan tambahan (opsional)"
                multiline
                style={[styles.input, styles.textAreaSmall]}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <View style={styles.footerRow}>
            <PressableScale
              scaleTo={0.97}
              disabled={submitting != null}
              onPress={() => submit('draft')}
              contentStyle={styles.draftButton}>
              <Icon name="file" size={16} color={colors.heading} />
              <Text style={styles.draftButtonText}>
                {submitting === 'draft' ? 'Menyimpan...' : 'Simpan Draf'}
              </Text>
            </PressableScale>
            <GradientButton
              label="Kirim Disposisi"
              icon="send"
              height={52}
              style={styles.sendButton}
              loading={submitting === 'send'}
              onPress={() => submit('send')}
            />
          </View>
        </View>
      </View>

      <StatusModal
        visible={result !== null}
        variant={result?.variant ?? 'success'}
        title={result?.title ?? ''}
        message={result?.message ?? ''}
        onRequestClose={handleResultClose}
        primaryAction={{
          label: result?.variant === 'success' ? 'Selesai' : 'Tutup',
          onPress: handleResultClose,
        }}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 48 },
  empty: { marginTop: 32, textAlign: 'center', fontSize: 14, color: colors.textMuted },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 18,
    ...smallButtonShadow,
  },
  block: { gap: 8 },
  blockHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  countHint: { fontSize: 12, color: colors.textMuted },
  letterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.attachmentRowSurface,
  },
  letterChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chipSurface,
  },
  letterBody: { flex: 1, gap: 4 },
  letterCode: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.textMuted,
    backgroundColor: colors.neutralSurface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  letterSubject: { fontSize: 13, fontWeight: '700', color: colors.heading },
  changeLink: { fontSize: 12, fontWeight: '600', color: colors.primary },
  pickLetter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primaryTintBorder,
    backgroundColor: colors.attachmentRowSurface,
  },
  pickLetterText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  repickHint: { fontSize: 11, color: colors.danger },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  recipientChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.chipSurface,
    borderWidth: 1,
    borderColor: colors.notifUnreadBorder,
    maxWidth: '100%',
  },
  recipientChipText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  addRecipient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.notifUnreadBorder,
  },
  addRecipientText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  input: { borderRadius: 12, borderColor: colors.borderSoft, color: colors.heading },
  textArea: { minHeight: 84, paddingTop: 12, textAlignVertical: 'top' },
  textAreaSmall: { minHeight: 56, paddingTop: 12, textAlignVertical: 'top' },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10,
    backgroundColor: colors.floatingSurface,
    ...tabBarShadow,
  },
  footerRow: { flexDirection: 'row', gap: 12 },
  draftButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...smallButtonShadow,
  },
  draftButtonText: { fontSize: 14, fontWeight: '600', color: colors.heading },
  sendButton: { flex: 1 },
  error: { fontSize: 13, color: colors.danger },
});
