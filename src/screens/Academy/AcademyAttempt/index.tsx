import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import BottomSheet from '@/components/organisms/BottomSheet';
import StatusModal from '@/components/organisms/StatusModal';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  getAcademyAttemptApi,
  saveAcademyResponseApi,
  submitAcademyAttemptApi,
} from '@/services/api/academy.service';
import { colors } from '@/theme/colors';
import type { AcademyAttempt, AcademyResponsePayload } from '@/types';
import { attemptRemainingSeconds, formatCountdown } from '@/utils/academy';
import { extractErrorMessage } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.academyAttempt>;
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type LocalAnswer = { selected_options?: number[]; text_answer?: string; numeric_answer?: number };

export default function AcademyAttemptScreen(props: Props) {
  const { navigation, route } = props;
  const { attemptId, programId } = route.params;

  const [attempt, setAttempt] = useState<AcademyAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [remaining, setRemaining] = useState(0);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getAcademyAttemptApi(attemptId);
      setAttempt(data);
      const seeded: Record<string, LocalAnswer> = {};
      Object.entries(data.responses ?? {}).forEach(([qid, r]) => {
        seeded[qid] = {
          selected_options: r.selected_options,
          text_answer: r.text_answer ?? undefined,
          numeric_answer: r.numeric_answer ?? undefined,
        };
      });
      setAnswers(seeded);
      setRemaining(attemptRemainingSeconds(data.expires_at, data.server_time));
    } catch (e) {
      setLoadError(extractErrorMessage(e, 'Gagal memuat ujian.'));
    }
    setLoading(false);
  }, [attemptId]);

  useEffect(() => {
    load();
  }, [load]);

  const doSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitAcademyAttemptApi(attemptId);
      navigation.replace(ROUTES.academyAttemptResult, { attemptId, programId });
    } catch (e) {
      submittedRef.current = false;
      setSubmitting(false);
      setSubmitError(extractErrorMessage(e, 'Gagal mengirim jawaban.'));
    }
  }, [attemptId, programId, navigation]);

  // Timer — hitung mundur lokal dari sisa waktu server; auto-submit saat habis.
  useEffect(() => {
    if (loading || !attempt) return;
    const id = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(id);
          doSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [loading, attempt, doSubmit]);

  const questions = useMemo(() => attempt?.questions ?? [], [attempt]);
  const current = questions[index];
  const answeredCount = useMemo(
    () =>
      questions.filter(q => {
        const a = answers[String(q.id)];
        return (
          (a?.selected_options && a.selected_options.length > 0) ||
          (a?.text_answer && a.text_answer.trim().length > 0) ||
          a?.numeric_answer != null
        );
      }).length,
    [questions, answers],
  );

  async function persist(questionId: number, payload: AcademyResponsePayload) {
    setSaveState('saving');
    try {
      await saveAcademyResponseApi(attemptId, questionId, payload);
      setSaveState('saved');
    } catch {
      // Simpan lokal tetap (brief §61/§62) — tandai belum tersinkron, tidak buang jawaban.
      setSaveState('error');
    }
  }

  function setSingle(optionId: number) {
    if (!current) return;
    const next = { selected_options: [optionId] };
    setAnswers(prev => ({ ...prev, [String(current.id)]: next }));
    persist(current.id, next);
  }

  function toggleMulti(optionId: number) {
    if (!current) return;
    const prevSel = answers[String(current.id)]?.selected_options ?? [];
    const selected_options = prevSel.includes(optionId)
      ? prevSel.filter(id => id !== optionId)
      : [...prevSel, optionId];
    setAnswers(prev => ({ ...prev, [String(current.id)]: { selected_options } }));
    persist(current.id, { selected_options });
  }

  function setText(text: string) {
    if (!current) return;
    setAnswers(prev => ({ ...prev, [String(current.id)]: { text_answer: text } }));
  }

  function commitText() {
    if (!current) return;
    const value = answers[String(current.id)]?.text_answer ?? '';
    persist(current.id, { text_answer: value });
  }

  function setTrueFalse(value: string) {
    if (!current) return;
    setAnswers(prev => ({ ...prev, [String(current.id)]: { text_answer: value } }));
    persist(current.id, { text_answer: value });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (loadError || !current) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errText}>{loadError ?? 'Ujian tidak tersedia.'}</Text>
        <GradientButton label="Kembali" height={48} onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const isLast = index === questions.length - 1;
  const progress = questions.length ? ((index + 1) / questions.length) * 100 : 0;
  const currentAnswer = answers[String(current.id)];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right', 'bottom']}>
      {/* top bar */}
      <View style={styles.topBar}>
        <View style={styles.topRow}>
          <PressableScale onPress={() => navigation.goBack()} hitSlop={12}>
            <View style={styles.exitBtn}>
              <Icon name="arrow-left" size={16} color={colors.textMuted} />
              <Text style={styles.exitText}>Keluar</Text>
            </View>
          </PressableScale>
          <View style={[styles.timerPill, remaining <= 60 && styles.timerPillCritical]}>
            <Icon
              name="clock"
              size={14}
              color={remaining <= 60 ? colors.danger : colors.primary}
            />
            <Text style={[styles.timerText, remaining <= 60 && styles.timerTextCritical]}>
              {formatCountdown(remaining)}
            </Text>
          </View>
        </View>
        <View style={styles.progressRow}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {index + 1} / {questions.length}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.qKicker}>Pertanyaan {index + 1}</Text>
        <Text style={styles.qText}>{current.question_text}</Text>

        <View style={styles.options}>
          {['single_choice', 'multiple_choice', 'true_false', 'boolean'].includes(
            current.question_type,
          ) && (current.options?.length ?? 0) > 0
            ? (current.options ?? []).map(option => {
                const selected = (currentAnswer?.selected_options ?? []).includes(option.id);
                const multi = current.question_type === 'multiple_choice';
                return (
                  <PressableScale
                    key={option.id}
                    scaleTo={0.99}
                    onPress={() => (multi ? toggleMulti(option.id) : setSingle(option.id))}>
                    <View style={[styles.opt, selected && styles.optSelected]}>
                      <View
                        style={[
                          multi ? styles.checkbox : styles.radio,
                          selected && styles.markSelected,
                        ]}>
                        {selected ? <Icon name="check" size={12} color={colors.surface} /> : null}
                      </View>
                      <Text style={styles.optText}>
                        <Text style={styles.optLabel}>{option.label}. </Text>
                        {option.option_text}
                      </Text>
                    </View>
                  </PressableScale>
                );
              })
            : current.question_type === 'true_false' || current.question_type === 'boolean'
              ? ['Benar', 'Salah'].map(value => {
                  const selected = currentAnswer?.text_answer === value;
                  return (
                    <PressableScale key={value} scaleTo={0.99} onPress={() => setTrueFalse(value)}>
                      <View style={[styles.opt, selected && styles.optSelected]}>
                        <View style={[styles.radio, selected && styles.markSelected]}>
                          {selected ? (
                            <Icon name="check" size={12} color={colors.surface} />
                          ) : null}
                        </View>
                        <Text style={styles.optText}>{value}</Text>
                      </View>
                    </PressableScale>
                  );
                })
              : current.question_type === 'numeric'
              ? (
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    placeholder="Jawaban angka"
                    placeholderTextColor={colors.placeholder}
                    value={currentAnswer?.numeric_answer != null ? String(currentAnswer.numeric_answer) : ''}
                    onChangeText={t => {
                      const num = Number(t);
                      setAnswers(prev => ({
                        ...prev,
                        [String(current.id)]: { numeric_answer: Number.isFinite(num) ? num : undefined },
                      }));
                    }}
                    onEndEditing={() => {
                      const num = currentAnswer?.numeric_answer;
                      if (num != null) persist(current.id, { numeric_answer: num });
                    }}
                  />
                )
              : (
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    multiline
                    placeholder="Tulis jawaban Anda"
                    placeholderTextColor={colors.placeholder}
                    value={currentAnswer?.text_answer ?? ''}
                    onChangeText={setText}
                    onEndEditing={commitText}
                  />
                )}
        </View>

        <View style={styles.saveRow}>
          {saveState === 'saving' ? (
            <Text style={styles.saveHint}>Menyimpan…</Text>
          ) : saveState === 'saved' ? (
            <>
              <Icon name="check" size={14} color={colors.success} />
              <Text style={[styles.saveHint, { color: colors.success }]}>Tersimpan</Text>
            </>
          ) : saveState === 'error' ? (
            <>
              <Icon name="alert-triangle" size={14} color={colors.warningText} />
              <Text style={[styles.saveHint, { color: colors.warningText }]}>
                Belum tersinkron — jawaban tetap tersimpan di perangkat
              </Text>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.navBar}>
        <PressableScale
          style={styles.flex}
          disabled={index === 0}
          onPress={() => setIndex(i => Math.max(0, i - 1))}>
          <View style={[styles.navBtn, styles.navBtnGhost, index === 0 && styles.navBtnDisabled]}>
            <Text style={styles.navBtnGhostText}>Sebelumnya</Text>
          </View>
        </PressableScale>
        {isLast ? (
          <GradientButton
            label="Selesai & Kumpulkan"
            height={50}
            style={styles.flex}
            onPress={() => setConfirmVisible(true)}
          />
        ) : (
          <GradientButton
            label="Berikutnya"
            height={50}
            style={styles.flex}
            onPress={() => setIndex(i => Math.min(questions.length - 1, i + 1))}
          />
        )}
      </View>

      <BottomSheet visible={confirmVisible} onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Kirim Jawaban?</Text>
          <View style={styles.sheetStats}>
            <View style={styles.sheetStat}>
              <Text style={[styles.sheetStatNum, { color: colors.success }]}>{answeredCount}</Text>
              <Text style={styles.sheetStatLabel}>Dijawab</Text>
            </View>
            <View style={[styles.sheetStat, styles.sheetStatDanger]}>
              <Text style={[styles.sheetStatNum, { color: colors.danger }]}>
                {questions.length - answeredCount}
              </Text>
              <Text style={[styles.sheetStatLabel, { color: colors.dangerText }]}>Belum Dijawab</Text>
            </View>
          </View>
          <Text style={styles.sheetNote}>
            Setelah dikirim, jawaban tidak dapat diubah dan waktu ujian berakhir.
          </Text>
          {submitError ? <Text style={styles.sheetError}>{submitError}</Text> : null}
          <View style={styles.sheetActions}>
            <PressableScale
              style={styles.flex}
              disabled={submitting}
              onPress={() => setConfirmVisible(false)}>
              <View style={[styles.navBtn, styles.navBtnGhost]}>
                <Text style={styles.navBtnGhostText}>Batal</Text>
              </View>
            </PressableScale>
            <GradientButton
              label="Kirim Jawaban"
              height={50}
              style={styles.flex}
              loading={submitting}
              onPress={doSubmit}
            />
          </View>
        </View>
      </BottomSheet>

      <StatusModal
        visible={remaining === 0 && !submittedRef.current && !!submitError}
        variant="error"
        title="Waktu Habis"
        message={submitError ?? 'Gagal mengirim jawaban otomatis.'}
        primaryAction={{ label: 'Coba Lagi', onPress: doSubmit }}
        onRequestClose={doSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, backgroundColor: colors.surface },
  errText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  topBar: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exitBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exitText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.chipSurface,
  },
  timerPillCritical: { backgroundColor: colors.dangerSurface },
  timerText: { fontSize: 13, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'] },
  timerTextCritical: { color: colors.danger },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  track: { flex: 1, height: 6, borderRadius: 999, backgroundColor: colors.chipSurface, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, backgroundColor: colors.primary },
  progressText: { fontSize: 12, fontWeight: '700', color: colors.heading },
  body: { padding: 20, paddingBottom: 32 },
  qKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: colors.placeholder, textTransform: 'uppercase' },
  qText: { fontSize: 17, fontWeight: '600', lineHeight: 25, color: colors.text, marginTop: 10 },
  options: { gap: 10, marginTop: 20 },
  opt: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  optSelected: { borderColor: colors.primary, backgroundColor: colors.chipSurface },
  radio: { width: 22, height: 22, borderRadius: 999, borderWidth: 2, borderColor: colors.placeholder, marginTop: 1, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.placeholder, marginTop: 1, alignItems: 'center', justifyContent: 'center' },
  markSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  optText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
  optLabel: { fontWeight: '700' },
  textInput: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, minHeight: 18 },
  saveHint: { fontSize: 12, color: colors.textMuted },
  navBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  navBtn: { height: 50, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  navBtnGhost: { borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface },
  navBtnGhostText: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  navBtnDisabled: { opacity: 0.5 },
  sheet: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, gap: 14 },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: colors.heading, letterSpacing: -0.3 },
  sheetStats: { flexDirection: 'row', gap: 12 },
  sheetStat: { flex: 1, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 14, padding: 14 },
  sheetStatDanger: { borderColor: colors.dangerMuted, backgroundColor: colors.dangerSurface },
  sheetStatNum: { fontSize: 24, fontWeight: '800' },
  sheetStatLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  sheetNote: { fontSize: 13, lineHeight: 19, color: colors.textMuted },
  sheetError: { fontSize: 13, color: colors.danger },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
});
