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
import { createRollCallApi } from '@/services/api/rollCall.service';
import { colors } from '@/theme/colors';
import { smallButtonShadow, tabBarShadow } from '@/theme/shadows';
import { extractErrorMessage } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.rollCallCreate>;

const NAME_PRESETS = [
  'Apel Pagi Satuan',
  'Apel Siang Satuan',
  'Apel Sore Satuan',
  'Apel Malam Satuan',
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function RollCallCreateScreen(props: Props) {
  const { navigation } = props;
  const keyboardHeight = useKeyboardHeight();

  const [name, setName] = useState('Apel Pagi Satuan');
  const [when, setWhen] = useState(() => new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ variant: 'success' | 'error'; title: string; message: string } | null>(
    null,
  );

  async function handleSubmit() {
    setFormError(null);
    setIsSubmitting(true);
    try {
      const date = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`;
      const time = `${pad(when.getHours())}:${pad(when.getMinutes())}`;
      await createRollCallApi({ date, time, name: name.trim() || undefined });
      setStatus({
        variant: 'success',
        title: 'Sesi Apel Dibuka',
        message: 'Sesi kekuatan apel berhasil dibuka. Seluruh personel satuan masuk daftar dengan status belum ditandai.',
      });
    } catch (error) {
      setStatus({
        variant: 'error',
        title: 'Gagal Membuka Sesi',
        message: extractErrorMessage(error, 'Terjadi kesalahan saat membuka sesi apel.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleStatusClose() {
    const wasSuccess = status?.variant === 'success';
    setStatus(null);
    if (wasSuccess) navigation.goBack();
  }

  return (
    <MainLayout
      title="Buat Sesi Apel"
      subtitle="Jadwalkan apel baru untuk satuan"
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
              label="Nama Sesi"
              placeholder="mis. Apel Siang Satuan"
              value={name}
              onChangeText={setName}
              style={styles.input}
              containerStyle={styles.field}
            />
            <View style={styles.chipRow}>
              {NAME_PRESETS.map(preset => {
                const active = preset === name.trim();
                return (
                  <PressableScale
                    key={preset}
                    scaleTo={0.96}
                    onPress={() => setName(preset)}
                    contentStyle={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{preset}</Text>
                  </PressableScale>
                );
              })}
            </View>

            <View style={styles.dateTimeRow}>
              <DateTimeField
                label="Tanggal"
                mode="date"
                value={when}
                onChange={next =>
                  setWhen(current => {
                    const merged = new Date(current);
                    merged.setFullYear(next.getFullYear(), next.getMonth(), next.getDate());
                    return merged;
                  })
                }
                containerStyle={styles.dateField}
              />
              <DateTimeField
                label="Waktu"
                mode="time"
                value={when}
                onChange={next =>
                  setWhen(current => {
                    const merged = new Date(current);
                    merged.setHours(next.getHours(), next.getMinutes(), 0, 0);
                    return merged;
                  })
                }
                containerStyle={styles.timeField}
              />
            </View>

            <View style={styles.hint}>
              <Icon name="info" size={16} color={colors.primary} />
              <Text style={styles.hintText}>
                Seluruh personel satuan otomatis masuk daftar sesi ini dengan status "Belum ditandai".
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <GradientButton label="Buat Sesi Apel" onPress={handleSubmit} loading={isSubmitting} />
        </View>
      </View>

      <StatusModal
        visible={status !== null}
        variant={status?.variant ?? 'success'}
        title={status?.title ?? ''}
        message={status?.message ?? ''}
        onRequestClose={handleStatusClose}
        primaryAction={{
          label: status?.variant === 'success' ? 'Selesai' : 'Tutup',
          onPress: handleStatusClose,
        }}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 24 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    padding: 20,
    gap: 4,
  },
  field: { marginBottom: 0 },
  input: {
    borderRadius: 14,
    borderColor: colors.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.heading,
    ...smallButtonShadow,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.chipSurface,
    borderColor: colors.primarySurface,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.primary },
  dateTimeRow: { flexDirection: 'row', gap: 12 },
  dateField: { flex: 2 },
  timeField: { flex: 1 },
  hint: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colors.chipSurface,
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
  },
  hintText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },
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
