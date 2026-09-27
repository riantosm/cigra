import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

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
import { createRollCallAgendaApi, getRollCallSessionTypesApi } from '@/services/api/rollCall.service';
import { colors } from '@/theme/colors';
import { smallButtonShadow } from '@/theme/shadows';
import type { RollCallSessionType } from '@/types';
import { extractErrorMessage } from '@/utils/format';
import { rollCallClock, sessionRangeLabel, toApiDate } from '@/utils/rollCall';
import { InfoCallout, sharedStyles } from '@/screens/RollCall/shared';

type Props = RootStackScreenProps<typeof ROUTES.rollCallAgendaCreate>;

const MAX_WAVE = 10;

type ModalState =
  | { kind: 'success'; agendaId: number; message: string; deadline: string | null }
  | { kind: 'error'; message: string }
  | null;

// Buka agenda apel (POST /roll-calls/agenda). Pilihan sesi dari GET /roll-calls/sessions —
// hanya yang aktif. Jam berakhir sesi = batas pengisian kompi.
export default function RollCallAgendaCreateScreen(props: Props) {
  const { navigation } = props;
  const keyboardHeight = useKeyboardHeight();

  const [sessions, setSessions] = useState<RollCallSessionType[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [date, setDate] = useState(() => new Date());
  const [wave, setWave] = useState(1);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);

  // Muat ulang tiap fokus — sesi bisa baru ditambah lewat "Kelola sesi".
  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const all = await getRollCallSessionTypesApi();
      const active = all
        .filter(session => session.is_active)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      setSessions(active);
      setSessionId(current =>
        current != null && active.some(session => session.id === current) ? current : (active[0]?.id ?? null),
      );
    } catch (error) {
      setLoadError(extractErrorMessage(error, 'Gagal memuat sesi piket.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const selected = sessions.find(session => session.id === sessionId) ?? null;
  const deadline = rollCallClock(selected?.end_time);

  async function handleSubmit() {
    if (!selected) return;
    setIsSubmitting(true);
    const apiDate = toApiDate(date);
    try {
      const result = await createRollCallAgendaApi({
        roll_call_session_type_id: selected.id,
        date: apiDate,
        wave,
        ...(notes.trim() ? { notes: notes.trim() } : null),
      });
      setModal({
        kind: 'success',
        agendaId: result.id,
        message: result.message,
        deadline: selected.end_time ? `${apiDate}T${selected.end_time}` : null,
      });
    } catch (error) {
      setModal({ kind: 'error', message: extractErrorMessage(error, 'Agenda apel gagal dibuka.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleModalClose() {
    const current = modal;
    setModal(null);
    if (current?.kind === 'success') {
      navigation.replace(ROUTES.rollCallAgendaDetail, { id: current.agendaId, deadline: current.deadline });
    }
  }

  return (
    <MainLayout
      title="Buka Agenda Apel"
      subtitle="Berlaku untuk seluruh kompi"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={sharedStyles.loader} color={colors.primary} />
      ) : (
        <View style={[sharedStyles.flex, { paddingBottom: keyboardHeight }]}>
          <ScrollView
            style={sharedStyles.flex}
            contentContainerStyle={[sharedStyles.scrollContent, styles.content]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}>
            <View>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Sesi Piket</Text>
                <PressableScale
                  onPress={() => navigation.navigate(ROUTES.rollCallSessions)}
                  contentStyle={styles.manageLink}>
                  <Icon name="edit" size={14} color={colors.primary} />
                  <Text style={styles.manageText}>Kelola sesi</Text>
                </PressableScale>
              </View>

              {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
              {!loadError && sessions.length === 0 ? (
                <Text style={styles.emptyText}>
                  Belum ada sesi piket yang aktif. Tambahkan sesi lewat “Kelola sesi”.
                </Text>
              ) : null}

              <View style={styles.optionList}>
                {sessions.map(session => {
                  const active = session.id === sessionId;
                  return (
                    <PressableScale
                      key={session.id}
                      scaleTo={0.98}
                      onPress={() => setSessionId(session.id)}
                      accessibilityState={{ selected: active }}
                      contentStyle={[styles.option, active && styles.optionActive]}>
                      <View style={[styles.radio, active && styles.radioActive]}>
                        {active ? <View style={styles.radioDot} /> : null}
                      </View>
                      <Text style={styles.optionLabel} numberOfLines={1}>
                        {session.name}
                      </Text>
                      <View style={styles.optionTime}>
                        <Icon name="clock" size={14} color={colors.placeholder} />
                        <Text style={styles.optionTimeText}>
                          {sessionRangeLabel(session.start_time, session.end_time)}
                        </Text>
                      </View>
                    </PressableScale>
                  );
                })}
              </View>
              {deadline ? (
                <Text style={styles.hint}>
                  Kompi bisa mengisi sampai pukul <Text style={styles.hintStrong}>{deadline}</Text>. Setelah itu
                  agenda terkunci otomatis.
                </Text>
              ) : null}
            </View>

            <DateTimeField label="Tanggal" mode="date" value={date} onChange={setDate} />

            <View>
              <Text style={styles.label}>Gelombang</Text>
              <View style={[sharedStyles.field, styles.stepper]}>
                <View style={styles.stepperIcon}>
                  <Icon name="layers" size={18} color={colors.primary} />
                </View>
                <Text style={styles.stepperLabel}>Gelombang ke-{wave}</Text>
                <PressableScale
                  accessibilityLabel="Kurangi gelombang"
                  disabled={wave <= 1}
                  onPress={() => setWave(current => Math.max(1, current - 1))}
                  contentStyle={[sharedStyles.chipButton, wave <= 1 && styles.stepDisabled]}>
                  <Icon name="minus" size={18} color={colors.primary} />
                </PressableScale>
                <Text style={styles.stepValue}>{wave}</Text>
                <PressableScale
                  accessibilityLabel="Tambah gelombang"
                  disabled={wave >= MAX_WAVE}
                  onPress={() => setWave(current => Math.min(MAX_WAVE, current + 1))}
                  contentStyle={[sharedStyles.chipButton, wave >= MAX_WAVE && styles.stepDisabled]}>
                  <Icon name="plus" size={18} color={colors.primary} />
                </PressableScale>
              </View>
              <Text style={styles.hintFaint}>Tambah bila sesi yang sama diadakan lebih dari sekali hari itu.</Text>
            </View>

            <TextField
              label="Catatan (opsional)"
              placeholder="Mis. apel persiapan latihan menembak"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={styles.notes}
            />

            <InfoCallout
              icon="bell"
              text="Perwakilan setiap kompi langsung menerima notifikasi untuk mengisi kehadiran setelah agenda dibuka."
            />
          </ScrollView>

          <View style={sharedStyles.footer}>
            <GradientButton
              label={selected ? `Buka Agenda ${selected.name}` : 'Buka Agenda'}
              icon="send"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={!selected || isSubmitting}
            />
          </View>
        </View>
      )}

      <StatusModal
        visible={modal !== null}
        variant={modal?.kind === 'error' ? 'error' : 'success'}
        title={modal?.kind === 'error' ? 'Gagal Membuka Agenda' : 'Agenda Dibuka'}
        message={modal?.message ?? ''}
        onRequestClose={handleModalClose}
        primaryAction={{
          label: modal?.kind === 'error' ? 'Tutup' : 'Lihat Rangkuman',
          onPress: handleModalClose,
        }}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20, paddingBottom: 24 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 14, fontWeight: '500', color: colors.textMuted, marginBottom: 6 },
  manageLink: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingLeft: 8 },
  manageText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  errorText: { fontSize: 13, color: colors.danger, marginBottom: 8 },
  emptyText: { fontSize: 13, lineHeight: 19, color: colors.textMuted, marginBottom: 8 },
  optionList: { gap: 8 },
  option: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...smallButtonShadow,
  },
  optionActive: { backgroundColor: colors.notifUnreadSurface, borderColor: colors.notifUnreadBorder },
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
  optionLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.heading },
  optionTime: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  optionTimeText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  hint: { fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: 8 },
  hintStrong: { fontWeight: '700', color: colors.heading },
  hintFaint: { fontSize: 12, lineHeight: 17, color: colors.placeholder, marginTop: 6 },
  stepper: { height: 54, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14, paddingRight: 8 },
  stepperIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chipSurface,
  },
  stepperLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.heading },
  stepDisabled: { opacity: 0.4 },
  stepValue: { width: 24, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.heading },
  notes: {
    minHeight: 84,
    borderRadius: 14,
    borderColor: colors.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
});
