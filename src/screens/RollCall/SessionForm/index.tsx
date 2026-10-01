import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import TextField from '@/components/atoms/TextField';
import DateTimeField from '@/components/molecules/DateTimeField';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  createRollCallSessionTypeApi,
  deleteRollCallSessionTypeApi,
  updateRollCallSessionTypeApi,
} from '@/services/api/rollCall.service';
import { colors } from '@/theme/colors';
import type { RollCallSessionTypePayload } from '@/types';
import { cleanValue, extractErrorMessage } from '@/utils/format';
import { timeToDate, toApiTime } from '@/utils/rollCall';
import { ToggleSwitch, sharedStyles } from '@/screens/RollCall/shared';

type Props = RootStackScreenProps<typeof ROUTES.rollCallSessionForm>;

type Modal =
  | { kind: 'confirm-delete' }
  | { kind: 'result'; variant: 'success' | 'error'; title: string; message: string; leave: boolean }
  | null;

// Tambah (POST /roll-calls/sessions) atau ubah (PATCH /{session}, hanya kolom yang berubah) sesi
// piket. Hapus (DELETE) ditolak backend bila sesi sudah pernah dipakai agenda.
export default function RollCallSessionFormScreen(props: Props) {
  const { navigation, route } = props;
  const session = route.params?.session;
  const isEdit = !!session;
  const keyboardHeight = useKeyboardHeight();

  const [name, setName] = useState(session?.name ?? '');
  const [code, setCode] = useState(session?.code ?? '');
  const [start, setStart] = useState(() => timeToDate(session?.start_time, 7));
  const [end, setEnd] = useState(() => timeToDate(session?.end_time, 9));
  const [description, setDescription] = useState(session?.description ?? '');
  const [isActive, setIsActive] = useState(session?.is_active ?? true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modal, setModal] = useState<Modal>(null);

  function buildPayload(): RollCallSessionTypePayload {
    const full: RollCallSessionTypePayload = {
      name: name.trim(),
      code: cleanValue(code)?.toUpperCase() ?? null,
      start_time: toApiTime(start),
      end_time: toApiTime(end),
      description: cleanValue(description),
      is_active: isActive,
    };
    if (!session) return full;
    // Mode ubah: kirim hanya kolom yang berubah.
    const changed: RollCallSessionTypePayload = {};
    if (full.name !== session.name) changed.name = full.name;
    if (full.code !== (session.code ?? null)) changed.code = full.code;
    if (full.start_time !== session.start_time.slice(0, 5)) changed.start_time = full.start_time;
    if (full.end_time !== session.end_time.slice(0, 5)) changed.end_time = full.end_time;
    if (full.description !== (session.description ?? null)) changed.description = full.description;
    if (full.is_active !== session.is_active) changed.is_active = full.is_active;
    return changed;
  }

  async function handleSave() {
    setFormError(null);
    if (!name.trim()) {
      setFormError('Nama sesi wajib diisi.');
      return;
    }
    if (toApiTime(end) <= toApiTime(start)) {
      setFormError('Jam berakhir harus setelah jam mulai.');
      return;
    }
    const payload = buildPayload();
    if (session && Object.keys(payload).length === 0) {
      navigation.goBack();
      return;
    }
    setIsSaving(true);
    try {
      const message = session
        ? await updateRollCallSessionTypeApi(session.id, payload)
        : (await createRollCallSessionTypeApi(payload)).message;
      setModal({
        kind: 'result',
        variant: 'success',
        title: session ? 'Sesi Diperbarui' : 'Sesi Ditambahkan',
        message,
        leave: true,
      });
    } catch (error) {
      setModal({
        kind: 'result',
        variant: 'error',
        title: 'Gagal Menyimpan',
        message: extractErrorMessage(error, 'Sesi piket gagal disimpan.'),
        leave: false,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!session) return;
    setModal(null);
    setIsDeleting(true);
    try {
      const message = await deleteRollCallSessionTypeApi(session.id);
      setModal({ kind: 'result', variant: 'success', title: 'Sesi Dihapus', message, leave: true });
    } catch (error) {
      setModal({
        kind: 'result',
        variant: 'error',
        title: 'Sesi Tidak Bisa Dihapus',
        message: extractErrorMessage(
          error,
          'Sesi yang sudah pernah dipakai agenda tidak bisa dihapus. Nonaktifkan saja sesi ini.',
        ),
        leave: false,
      });
    } finally {
      setIsDeleting(false);
    }
  }

  function closeResult() {
    const leave = modal?.kind === 'result' && modal.leave;
    setModal(null);
    if (leave) navigation.goBack();
  }

  return (
    <MainLayout
      title={isEdit ? 'Ubah Sesi' : 'Tambah Sesi'}
      subtitle={isEdit ? session?.name : 'Sesi apel yang berlaku di satuan'}
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <View style={[sharedStyles.flex, { paddingBottom: keyboardHeight }]}>
        <ScrollView
          style={sharedStyles.flex}
          contentContainerStyle={[sharedStyles.scrollContent, styles.content]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive">
          <TextField label="Nama sesi" placeholder="Mis. Apel Pagi" value={name} onChangeText={setName} />
          <TextField
            label="Kode singkat (opsional)"
            placeholder="Mis. APPAG"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
          />

          <View>
            <View style={styles.timeRow}>
              <DateTimeField
                label="Jam mulai"
                mode="time"
                value={start}
                onChange={setStart}
                containerStyle={sharedStyles.flex}
              />
              <DateTimeField
                label="Jam berakhir"
                mode="time"
                value={end}
                onChange={setEnd}
                containerStyle={sharedStyles.flex}
              />
            </View>
            <Text style={styles.hint}>Kompi bisa mengisi sampai jam berakhir. Setelah itu agenda terkunci otomatis.</Text>
          </View>

          <TextField
            label="Keterangan (opsional)"
            placeholder="Mis. apel malam seluruh kompi di lapangan utama"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={styles.textarea}
          />

          <View style={[sharedStyles.field, styles.switchRow]}>
            <View style={styles.switchBody}>
              <Text style={styles.switchTitle}>Sesi aktif</Text>
              <Text style={sharedStyles.rowMeta}>Muncul sebagai pilihan saat membuka agenda</Text>
            </View>
            <ToggleSwitch value={isActive} onChange={setIsActive} />
          </View>

          {isEdit ? (
            <View style={styles.deleteBlock}>
              <PressableScale
                disabled={isDeleting}
                onPress={() => setModal({ kind: 'confirm-delete' })}
                contentStyle={styles.deleteButton}>
                <Icon name="trash" size={16} color={colors.danger} />
                <Text style={styles.deleteText}>{isDeleting ? 'Menghapus…' : 'Hapus Sesi'}</Text>
              </PressableScale>
              <Text style={styles.deleteHint}>Tidak bisa dihapus bila sudah dipakai di agenda.</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={sharedStyles.footer}>
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <GradientButton
            label={isEdit ? 'Simpan Perubahan' : 'Tambah Sesi'}
            icon="check"
            loading={isSaving}
            disabled={isSaving}
            onPress={handleSave}
          />
        </View>
      </View>

      <StatusModal
        visible={modal?.kind === 'confirm-delete'}
        variant="error"
        title={`Hapus ${session?.name ?? 'sesi'}?`}
        message="Sesi ini tidak akan muncul lagi saat membuka agenda. Riwayat apel yang sudah memakai sesi ini tetap tersimpan."
        onRequestClose={() => setModal(null)}
        secondaryAction={{ label: 'Batal', onPress: () => setModal(null) }}
        primaryAction={{ label: 'Hapus', onPress: handleDelete }}
      />
      <StatusModal
        visible={modal?.kind === 'result'}
        variant={modal?.kind === 'result' ? modal.variant : 'success'}
        title={modal?.kind === 'result' ? modal.title : ''}
        message={modal?.kind === 'result' ? modal.message : ''}
        onRequestClose={closeResult}
        primaryAction={{ label: modal?.kind === 'result' && modal.leave ? 'Selesai' : 'Tutup', onPress: closeResult }}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  content: { gap: 18, paddingBottom: 24 },
  timeRow: { flexDirection: 'row', gap: 10 },
  hint: { fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: 8 },
  textarea: {
    minHeight: 84,
    borderRadius: 14,
    borderColor: colors.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  switchBody: { flex: 1, gap: 2 },
  switchTitle: { fontSize: 15, fontWeight: '600', color: colors.heading },
  deleteBlock: { alignItems: 'center', gap: 4 },
  deleteButton: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16 },
  deleteText: { fontSize: 14, fontWeight: '600', color: colors.danger },
  deleteHint: { fontSize: 11, color: colors.placeholder, textAlign: 'center' },
  error: { fontSize: 13, color: colors.danger },
});
