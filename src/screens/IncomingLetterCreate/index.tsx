import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

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
import { createIncomingLetterApi } from '@/services/api/disposition.service';
import { colors } from '@/theme/colors';
import { smallButtonShadow, tabBarShadow } from '@/theme/shadows';
import type { FilePickResult, SecurityLevel } from '@/types';
import { extractErrorMessage } from '@/utils/format';
import { formatFileSize, pickAttachment } from '@/utils/filePicker';
import { SECURITY_LEVELS, securityLevelLabel, toApiDate } from '@/utils/disposition';

type Props = RootStackScreenProps<typeof ROUTES.incomingLetterCreate>;

export default function IncomingLetterCreateScreen(props: Props) {
  const { navigation } = props;
  const keyboardHeight = useKeyboardHeight();
  const today = new Date();

  const [letterNumber, setLetterNumber] = useState('');
  const [sourceSender, setSourceSender] = useState('');
  const [letterDate, setLetterDate] = useState(today);
  const [receivedDate, setReceivedDate] = useState(today);
  const [subject, setSubject] = useState('');
  const [security, setSecurity] = useState<SecurityLevel>('biasa');
  const [agendaNumber, setAgendaNumber] = useState('');
  const [summary, setSummary] = useState('');
  const [file, setFile] = useState<FilePickResult | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  async function handlePickFile() {
    setFormError(null);
    try {
      const picked = await pickAttachment({ allowDoc: true });
      if (picked) setFile(picked);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Gagal memilih file.');
    }
  }

  async function handleSubmit() {
    setFormError(null);
    if (!letterNumber.trim() || !sourceSender.trim() || !subject.trim()) {
      setFormError('Lengkapi nomor surat, asal/pengirim, dan perihal.');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createIncomingLetterApi(
        {
          letter_number: letterNumber.trim(),
          source_sender: sourceSender.trim(),
          letter_date: toApiDate(letterDate),
          received_date: toApiDate(receivedDate),
          subject: subject.trim(),
          security_level: security,
          ...(agendaNumber.trim() ? { agenda_number: agendaNumber.trim() } : null),
          ...(summary.trim() ? { summary: summary.trim() } : null),
        },
        file,
      );
      navigation.replace(ROUTES.dispositionCompose, {
        incomingLetter: {
          id: result.id,
          letter_number: result.letter_number,
          subject: result.subject,
        },
      });
    } catch (error) {
      setErrorModal(extractErrorMessage(error, 'Gagal mencatat surat masuk.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <MainLayout
      title="Catat Surat Masuk"
      subtitle="Tambah surat baru untuk didisposisikan"
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
            <TextField
              label="Nomor Surat *"
              value={letterNumber}
              onChangeText={setLetterNumber}
              placeholder="B/555/IX/2026"
              containerStyle={styles.field}
              style={styles.input}
            />
            <TextField
              label="Asal / Pengirim *"
              value={sourceSender}
              onChangeText={setSourceSender}
              placeholder="Kodam III Siliwangi"
              containerStyle={styles.field}
              style={styles.input}
            />
            <View style={styles.dateRow}>
              <DateTimeField
                label="Tgl Surat *"
                mode="date"
                value={letterDate}
                onChange={setLetterDate}
                maximumDate={today}
                containerStyle={styles.dateField}
              />
              <DateTimeField
                label="Tgl Diterima *"
                mode="date"
                value={receivedDate}
                onChange={setReceivedDate}
                maximumDate={today}
                containerStyle={styles.dateField}
              />
            </View>
            <TextField
              label="Perihal / Subjek *"
              value={subject}
              onChangeText={setSubject}
              placeholder="Instruksi Kesiapsiagaan Bencana"
              containerStyle={styles.field}
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Tingkat Keamanan *</Text>
            <SegmentedControl
              options={SECURITY_LEVELS.map(level => ({ value: level, label: securityLevelLabel[level] }))}
              value={security}
              onChange={setSecurity}
              style={styles.field}
            />

            <TextField
              label="No. Agenda"
              value={agendaNumber}
              onChangeText={setAgendaNumber}
              placeholder="AG/099"
              containerStyle={styles.field}
              style={styles.input}
            />
            <TextField
              label="Ringkasan"
              value={summary}
              onChangeText={setSummary}
              placeholder="Isi singkat surat (opsional)"
              multiline
              containerStyle={styles.field}
              style={[styles.input, styles.textArea]}
            />

            <Text style={styles.fieldLabel}>Lampiran Scan / PDF</Text>
            <PressableScale scaleTo={0.98} onPress={handlePickFile} contentStyle={styles.dropzone}>
              <Icon name="download" size={20} color={colors.primary} />
              <Text style={styles.dropzoneTitle}>Pilih file</Text>
              <Text style={styles.dropzoneHint}>PDF, JPG, PNG, DOC · maks 10 MB</Text>
            </PressableScale>
            {file ? (
              <View style={styles.fileChip}>
                <Icon name="file" size={15} color={colors.primary} />
                <Text style={styles.fileChipName} numberOfLines={1}>
                  {file.name}
                  {file.size ? ` · ${formatFileSize(file.size)}` : ''}
                </Text>
                <PressableScale scaleTo={0.9} onPress={() => setFile(null)} hitSlop={10}>
                  <Icon name="close" size={15} color={colors.placeholder} />
                </PressableScale>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <GradientButton
            label="Simpan & Lanjut Buat Disposisi"
            onPress={handleSubmit}
            loading={isSubmitting}
          />
        </View>
      </View>

      <StatusModal
        visible={errorModal !== null}
        variant="error"
        title="Gagal Menyimpan"
        message={errorModal ?? ''}
        onRequestClose={() => setErrorModal(null)}
        primaryAction={{ label: 'Tutup', onPress: () => setErrorModal(null) }}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 16,
    ...smallButtonShadow,
  },
  field: {},
  fieldLabel: { fontSize: 14, fontWeight: '500', color: colors.textMuted, marginBottom: -8 },
  input: { borderRadius: 12, borderColor: colors.borderSoft },
  textArea: { minHeight: 66, paddingTop: 12, textAlignVertical: 'top' },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateField: { flex: 1 },
  dropzone: {
    borderWidth: 1.5,
    borderColor: colors.primaryTintBorder,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.attachmentRowSurface,
    marginTop: -8,
  },
  dropzoneTitle: { fontSize: 13, fontWeight: '600', color: colors.primary },
  dropzoneHint: { fontSize: 11, color: colors.placeholder },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.attachmentRowSurface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginTop: -6,
  },
  fileChipName: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.heading },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10,
    backgroundColor: colors.floatingSurface,
    ...tabBarShadow,
  },
  error: { fontSize: 13, color: colors.danger },
});
