import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import TextField from '@/components/atoms/TextField';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { addDispositionFollowUpApi } from '@/services/api/disposition.service';
import { colors } from '@/theme/colors';
import { smallButtonShadow, tabBarShadow } from '@/theme/shadows';
import type { FilePickResult } from '@/types';
import { extractErrorMessage } from '@/utils/format';
import { formatFileSize, pickAttachment } from '@/utils/filePicker';

type Props = RootStackScreenProps<typeof ROUTES.dispositionFollowUp>;

const MAX_NOTES = 1000;

export default function DispositionFollowUpScreen(props: Props) {
  const { navigation, route } = props;
  const { id, dispositionNumber, subject } = route.params;
  const keyboardHeight = useKeyboardHeight();

  const [notes, setNotes] = useState('');
  const [attachment, setAttachment] = useState<FilePickResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ variant: 'success' | 'error'; title: string; message: string } | null>(
    null,
  );

  async function handlePickFile() {
    setFormError(null);
    try {
      const file = await pickAttachment({ allowDoc: true });
      if (file) setAttachment(file);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Gagal memilih file.');
    }
  }

  async function handleSubmit() {
    setFormError(null);
    if (!notes.trim()) {
      setFormError('Catatan tindak lanjut wajib diisi.');
      return;
    }
    setIsSubmitting(true);
    try {
      await addDispositionFollowUpApi(id, { notes: notes.trim(), attachment });
      setResult({
        variant: 'success',
        title: 'Tindak Lanjut Ditambahkan',
        message: 'Catatan tindak lanjut berhasil dikirim.',
      });
    } catch (error) {
      setResult({
        variant: 'error',
        title: 'Gagal Mengirim',
        message: extractErrorMessage(error, 'Terjadi kesalahan saat menambah tindak lanjut.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleResultClose() {
    const wasSuccess = result?.variant === 'success';
    setResult(null);
    if (wasSuccess) navigation.goBack();
  }

  return (
    <MainLayout
      title="Tambah Tindak Lanjut"
      subtitle={dispositionNumber ?? `#${id}`}
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <View style={[styles.flex, { paddingBottom: keyboardHeight }]}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}>
          {subject ? (
            <View style={styles.contextPill}>
              <Icon name="mail" size={14} color={colors.primary} />
              <Text style={styles.contextText} numberOfLines={1}>
                {subject}
              </Text>
            </View>
          ) : null}

          <View style={styles.fieldHead}>
            <View style={styles.fieldChip}>
              <Icon name="edit" size={15} color={colors.primary} />
            </View>
            <Text style={styles.fieldLabel}>Catatan Tindak Lanjut</Text>
            <Text style={styles.required}>Wajib</Text>
          </View>
          <View style={styles.textAreaWrap}>
            <TextField
              placeholder="Tulis progres / hasil koordinasi lapangan..."
              value={notes}
              onChangeText={text => setNotes(text.slice(0, MAX_NOTES))}
              multiline
              style={styles.textArea}
            />
            <Text style={styles.counter}>
              {notes.length} / {MAX_NOTES}
            </Text>
          </View>

          <View style={[styles.fieldHead, styles.fieldHeadSpaced]}>
            <View style={styles.fieldChip}>
              <Icon name="paperclip" size={15} color={colors.primary} />
            </View>
            <Text style={styles.fieldLabel}>Lampiran</Text>
            <Text style={styles.optional}>Opsional</Text>
          </View>
          <PressableScale scaleTo={0.98} onPress={handlePickFile} contentStyle={styles.dropzone}>
            <Icon name="download" size={22} color={colors.primary} />
            <Text style={styles.dropzoneTitle}>Pilih file pendukung</Text>
            <Text style={styles.dropzoneHint}>PDF, DOC, DOCX, PNG, JPG · maks 10 MB</Text>
          </PressableScale>
          {attachment ? (
            <View style={styles.fileChip}>
              <Icon name="file" size={16} color={colors.primary} />
              <View style={styles.fileChipBody}>
                <Text style={styles.fileChipName} numberOfLines={1}>
                  {attachment.name}
                </Text>
                {attachment.size ? (
                  <Text style={styles.fileChipSize}>{formatFileSize(attachment.size)}</Text>
                ) : null}
              </View>
              <PressableScale scaleTo={0.9} onPress={() => setAttachment(null)} hitSlop={10}>
                <Icon name="close" size={16} color={colors.placeholder} />
              </PressableScale>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <GradientButton
            label="Kirim Tindak Lanjut"
            icon="send"
            onPress={handleSubmit}
            loading={isSubmitting}
          />
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
  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },
  contextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.chipSurface,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
    marginBottom: 20,
    maxWidth: '100%',
  },
  contextText: { flexShrink: 1, fontSize: 12, fontWeight: '600', color: colors.primary },
  fieldHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  fieldHeadSpaced: { marginTop: 20 },
  fieldChip: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chipSurface,
  },
  fieldLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  required: { fontSize: 11, fontWeight: '700', color: colors.danger },
  optional: { fontSize: 11, color: colors.placeholder },
  textAreaWrap: { position: 'relative' },
  textArea: {
    minHeight: 132,
    borderRadius: 14,
    borderColor: colors.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingBottom: 26,
    fontSize: 15,
    color: colors.heading,
    textAlignVertical: 'top',
    ...smallButtonShadow,
  },
  counter: { position: 'absolute', right: 12, bottom: 10, fontSize: 11, color: colors.placeholder },
  dropzone: {
    borderWidth: 1.5,
    borderColor: colors.primaryTintBorder,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.attachmentRowSurface,
  },
  dropzoneTitle: { fontSize: 13, fontWeight: '600', color: colors.primary },
  dropzoneHint: { fontSize: 11, color: colors.placeholder },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.attachmentRowSurface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  fileChipBody: { flex: 1 },
  fileChipName: { fontSize: 12, fontWeight: '700', color: colors.heading },
  fileChipSize: { fontSize: 11, color: colors.textMuted },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10,
    backgroundColor: colors.floatingSurface,
    ...tabBarShadow,
  },
  error: { fontSize: 13, color: colors.danger },
});
