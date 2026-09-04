import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { MotiView } from 'moti';

import Icon from '@/components/atoms/Icon';
import GradientButton from '@/components/atoms/GradientButton';
import PressableScale from '@/components/atoms/PressableScale';
import ScreenBackground from '@/components/atoms/ScreenBackground';
import StatusModal from '@/components/organisms/StatusModal';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  formatClock,
  getTkdModule,
  TKD_SUBTESTS,
  type TkdQuestion,
  type TkdSubtest,
} from '@/screens/Academy/tkd/data';
import { colors } from '@/theme/colors';
import { cardShadow, tabBarShadow } from '@/theme/shadows';
import { contentEnterTransition } from '@/utils/motion';

export type TkdExamScreenProps = RootStackScreenProps<typeof ROUTES.academyTkdExam>;

const RED_THRESHOLD_SEC = 5 * 60;

export default function TkdExamScreen(props: TkdExamScreenProps) {
  const { navigation, route } = props;
  const insets = useSafeAreaInsets();
  const module = getTkdModule(route.params.moduleId);
  const questions = useMemo(() => module?.questions ?? [], [module]);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [ragu, setRagu] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(module?.durationSeconds ?? 0);
  const [showNav, setShowNav] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const submittedRef = useRef(false);

  const answeredCount = questions.filter(q => answers[q.id]).length;
  const raguCount = questions.filter(q => ragu[q.id]).length;
  const blankCount = questions.length - answeredCount;

  const submit = useCallback(() => {
    if (submittedRef.current || !module) return;
    submittedRef.current = true;
    navigation.replace(ROUTES.academyTkdResult, {
      moduleId: module.id,
      answers,
      raguIds: Object.keys(ragu).filter(id => ragu[id]),
      elapsedSeconds: module.durationSeconds - secondsLeft,
    });
  }, [module, navigation, answers, ragu, secondsLeft]);

  // Timer
  useEffect(() => {
    if (!module) return undefined;
    const t = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(t);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [module]);

  useEffect(() => {
    if (secondsLeft === 0 && module && !submittedRef.current) submit();
  }, [secondsLeft, module, submit]);

  // Android back → konfirmasi keluar (kecuali overlay/nav sedang terbuka).
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showConfirm) {
        setShowConfirm(false);
        return true;
      }
      if (showNav) {
        setShowNav(false);
        return true;
      }
      setShowExit(true);
      return true;
    });
    return () => sub.remove();
  }, [showNav, showConfirm]);

  if (!module || questions.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenBackground />
        <Text style={styles.missing}>Modul tidak ditemukan.</Text>
      </SafeAreaView>
    );
  }

  const q = questions[index];
  const isTkp = q.subtest === 'TKP';
  const timerCritical = secondsLeft <= RED_THRESHOLD_SEC;

  const selectOption = (key: string) => setAnswers(prev => ({ ...prev, [q.id]: key }));
  const toggleRagu = () => setRagu(prev => ({ ...prev, [q.id]: !prev[q.id] }));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenBackground />

      <View style={styles.header}>
        <PressableScale
          onPress={() => setShowExit(true)}
          contentStyle={styles.backBtn}
          accessibilityLabel="Kembali">
          <Icon name="arrow-left" size={22} color={colors.heading} />
        </PressableScale>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {module.fullTitle}
        </Text>
        <View
          style={[styles.timer, timerCritical ? styles.timerRed : styles.timerAmber]}>
          <Icon
            name="clock"
            size={12}
            color={timerCritical ? colors.danger : colors.warningText}
          />
          <Text
            style={[
              styles.timerText,
              { color: timerCritical ? colors.danger : colors.warningText },
            ]}>
            {formatClock(secondsLeft)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.flex1}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        key={q.id}>
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={contentEnterTransition}
          style={styles.stack}>
          <View style={styles.subBar}>
            <View style={styles.subBarLeft}>
              <Text style={styles.subBarKicker}>SUBKATEGORI</Text>
              <Text style={styles.subBarName}>{TKD_SUBTESTS[q.subtest].label}</Text>
            </View>
            <View style={styles.subBarRight}>
              <Text style={styles.subBarCount}>
                {index + 1}
                <Text style={styles.subBarCountTotal}> / {questions.length}</Text>
              </Text>
              <Text style={styles.subBarSub}>{answeredCount} terjawab</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(answeredCount / questions.length) * 100}%` },
              ]}
            />
          </View>

          {isTkp ? (
            <View style={styles.tkpNote}>
              <Icon name="info" size={15} color={colors.primary} />
              <Text style={styles.tkpNoteText}>
                Pada TKP semua pilihan bernilai (1–5). Pilih yang{' '}
                <Text style={styles.tkpBold}>paling</Text> menggambarkan sikapmu.
              </Text>
            </View>
          ) : null}

          <View style={styles.qCard}>
            <View style={styles.qMeta}>
              <View style={styles.qChip}>
                <Text style={styles.qChipText}>SOAL {index + 1}</Text>
              </View>
              {!isTkp ? <Text style={styles.qHint}>Pilih satu jawaban</Text> : null}
            </View>
            <Text style={styles.qPrompt}>{q.prompt}</Text>
          </View>

          <View style={styles.options}>
            {q.options.map(opt => {
              const on = answers[q.id] === opt.key;
              return (
                <PressableScale
                  key={opt.key}
                  scaleTo={0.98}
                  onPress={() => selectOption(opt.key)}
                  contentStyle={[styles.opt, on && styles.optOn]}>
                  <View style={[styles.optKey, on && styles.optKeyOn]}>
                    {on ? (
                      <Svg style={StyleSheet.absoluteFill}>
                        <Defs>
                          <LinearGradient id="tkdOptKey" x1="0" y1="0" x2="1" y2="1">
                            <Stop offset="0" stopColor={colors.academyAkademikStart} />
                            <Stop offset="1" stopColor={colors.academyAkademikEnd} />
                          </LinearGradient>
                        </Defs>
                        <Rect width="100%" height="100%" rx={8} fill="url(#tkdOptKey)" />
                      </Svg>
                    ) : null}
                    <Text style={[styles.optKeyText, on && styles.optKeyTextOn]}>{opt.key}</Text>
                  </View>
                  <Text style={styles.optText}>{opt.text}</Text>
                </PressableScale>
              );
            })}
          </View>

          <Pressable
            onPress={toggleRagu}
            style={[styles.raguRow, ragu[q.id] && styles.raguRowOn]}>
            <View style={styles.raguLabel}>
              <Icon
                name="flag"
                size={15}
                color={ragu[q.id] ? colors.warningText : colors.placeholder}
              />
              <Text
                style={[
                  styles.raguText,
                  { color: ragu[q.id] ? colors.warningText : colors.textMuted },
                ]}>
                Tandai ragu-ragu
              </Text>
            </View>
            <View style={[styles.switch, ragu[q.id] && styles.switchOn]}>
              <View style={[styles.knob, ragu[q.id] && styles.knobOn]} />
            </View>
          </Pressable>
        </MotiView>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 14 + insets.bottom }]}>
        <PressableScale
          onPress={() => setShowNav(true)}
          contentStyle={styles.navBtn}
          accessibilityLabel="Navigasi soal">
          <Icon name="grid" size={20} color={colors.textMuted} />
        </PressableScale>
        <PressableScale
          scaleTo={0.98}
          disabled={index === 0}
          onPress={() => setIndex(i => Math.max(0, i - 1))}
          contentStyle={[styles.prevBtn, index === 0 && styles.btnDisabled]}>
          <View style={styles.flip}>
            <Icon name="chevron-right" size={16} color={colors.textMuted} />
          </View>
          <Text style={styles.prevText}>Sebelumnya</Text>
        </PressableScale>
        {index < questions.length - 1 ? (
          <PressableScale
            scaleTo={0.98}
            onPress={() => setIndex(i => Math.min(questions.length - 1, i + 1))}
            style={styles.nextWrap}
            contentStyle={styles.nextBtn}>
            <NextGradient />
            <Text style={styles.nextText}>Selanjutnya</Text>
            <Icon name="chevron-right" size={16} color={colors.primaryForeground} />
          </PressableScale>
        ) : (
          <PressableScale
            scaleTo={0.98}
            onPress={() => setShowNav(true)}
            style={styles.nextWrap}
            contentStyle={styles.nextBtn}>
            <NextGradient />
            <Text style={styles.nextText}>Navigasi Soal</Text>
            <Icon name="grid" size={16} color={colors.primaryForeground} />
          </PressableScale>
        )}
      </View>

      {showNav ? (
        <NavigatorOverlay
          questions={questions}
          answers={answers}
          ragu={ragu}
          currentId={q.id}
          secondsLeft={secondsLeft}
          blankCount={blankCount}
          answeredCount={answeredCount}
          raguCount={raguCount}
          onClose={() => setShowNav(false)}
          onJump={i => {
            setIndex(i);
            setShowNav(false);
          }}
          onSubmit={() => {
            setShowNav(false);
            setShowConfirm(true);
          }}
        />
      ) : null}

      <SubmitModal
        visible={showConfirm}
        answered={answeredCount}
        total={questions.length}
        blank={blankCount}
        raguCount={raguCount}
        secondsLeft={secondsLeft}
        onCancel={() => setShowConfirm(false)}
        onConfirm={submit}
      />

      <StatusModal
        visible={showExit}
        variant="error"
        title="Keluar dari tryout?"
        message="Kamu akan keluar dari sesi ini. Jawaban yang sudah dipilih tidak disimpan."
        primaryAction={{
          label: 'Ya, keluar',
          onPress: () => {
            setShowExit(false);
            navigation.goBack();
          },
        }}
        secondaryAction={{ label: 'Lanjut kerjakan', onPress: () => setShowExit(false) }}
        onRequestClose={() => setShowExit(false)}
      />
    </SafeAreaView>
  );
}

function NextGradient() {
  return (
    <Svg style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="tkdNext" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.academyAkademikStart} />
          <Stop offset="1" stopColor={colors.academyAkademikEnd} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" rx={26} fill="url(#tkdNext)" />
    </Svg>
  );
}

// ---------------------------------------------------------------------------

interface NavProps {
  questions: TkdQuestion[];
  answers: Record<string, string>;
  ragu: Record<string, boolean>;
  currentId: string;
  secondsLeft: number;
  blankCount: number;
  answeredCount: number;
  raguCount: number;
  onClose: () => void;
  onJump: (index: number) => void;
  onSubmit: () => void;
}

function NavigatorOverlay(p: NavProps) {
  const subtests = useMemo(() => {
    const seen: TkdSubtest[] = [];
    for (const q of p.questions) if (!seen.includes(q.subtest)) seen.push(q.subtest);
    return seen;
  }, [p.questions]);
  const currentSubtest = p.questions.find(q => q.id === p.currentId)?.subtest ?? subtests[0];
  const [tab, setTab] = useState<TkdSubtest>(currentSubtest);

  const rows = p.questions
    .map((q, i) => ({ q, i }))
    .filter(x => x.q.subtest === tab);
  const firstNo = p.questions.findIndex(q => q.subtest === tab) + 1;
  const lastNo = firstNo + rows.length - 1;

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.overlayInner} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <PressableScale onPress={p.onClose} contentStyle={styles.backBtn} accessibilityLabel="Tutup">
            <Icon name="close" size={22} color={colors.heading} />
          </PressableScale>
          <Text style={styles.headerTitle}>Navigasi Soal</Text>
          <View style={[styles.timer, styles.timerRed]}>
            <Icon name="clock" size={12} color={colors.danger} />
            <Text style={[styles.timerText, { color: colors.danger }]}>
              {formatClock(p.secondsLeft)}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <View style={styles.stack}>
            <View style={styles.navStatRow}>
              <NavStat label="TERJAWAB" value={p.answeredCount} color={colors.success} />
              <NavStat label="RAGU-RAGU" value={p.raguCount} color={colors.warningText} />
              <NavStat label="BELUM" value={p.blankCount} color={colors.danger} />
            </View>

            {subtests.length > 1 ? (
              <View style={styles.segment}>
                {subtests.map(s => {
                  const on = s === tab;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setTab(s)}
                      style={[styles.segmentItem, on && styles.segmentItemOn]}
                      accessibilityRole="button"
                      accessibilityState={on ? { selected: true } : {}}>
                      {on ? (
                        <Svg style={StyleSheet.absoluteFill}>
                          <Defs>
                            <LinearGradient id={`seg-${s}`} x1="0" y1="0" x2="1" y2="1">
                              <Stop offset="0" stopColor={colors.academyAkademikStart} />
                              <Stop offset="1" stopColor={colors.academyAkademikEnd} />
                            </LinearGradient>
                          </Defs>
                          <Rect width="100%" height="100%" fill={`url(#seg-${s})`} />
                        </Svg>
                      ) : null}
                      <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.legendRow}>
              <Legend color={colors.academyAkademikSurface} border={colors.academyAkademikBorder} label="Terjawab" />
              <Legend color={colors.academyWarnSurface} border={colors.academyWarnBorder} label="Ragu-ragu" />
              <Legend color={colors.surface} border={colors.borderSoft} label="Belum" />
              <Legend color={colors.academyHeroSurface} border={colors.academyHeroSurface} label="Soal aktif" />
            </View>

            <View style={styles.gridCard}>
              <Text style={styles.gridHead}>
                {tab} · SOAL {firstNo}–{lastNo}
              </Text>
              <View style={styles.grid}>
                {rows.map(({ q, i }) => {
                  const isNow = q.id === p.currentId;
                  const answered = Boolean(p.answers[q.id]);
                  const isRagu = Boolean(p.ragu[q.id]);
                  return (
                    <Pressable
                      key={q.id}
                      onPress={() => p.onJump(i)}
                      style={[
                        styles.cell,
                        answered && styles.cellDone,
                        isRagu && styles.cellRagu,
                        isNow && styles.cellNow,
                      ]}>
                      <Text
                        style={[
                          styles.cellText,
                          answered && styles.cellTextDone,
                          isRagu && styles.cellTextRagu,
                          isNow && styles.cellTextNow,
                        ]}>
                        {i + 1}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, styles.overlayFooter]}>
          <View style={styles.overlayFooterInner}>
            <Text style={styles.footerNote}>
              {p.blankCount > 0
                ? `${p.blankCount} soal belum dijawab`
                : 'Semua soal sudah terjawab'}{' '}
              — sisa waktu {formatClock(p.secondsLeft)}
            </Text>
            <GradientButton
              tone="akademik"
              icon="check"
              label="Selesai & Kumpulkan"
              height={52}
              onPress={p.onSubmit}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function NavStat(props: { label: string; value: number; color: string }) {
  return (
    <View style={styles.navStat}>
      <Text style={styles.navStatLabel}>{props.label}</Text>
      <Text style={[styles.navStatValue, { color: props.color }]}>{props.value}</Text>
    </View>
  );
}

function Legend(props: { color: string; border: string; label: string }) {
  return (
    <View style={styles.legend}>
      <View style={[styles.legendChip, { backgroundColor: props.color, borderColor: props.border }]} />
      <Text style={styles.legendText}>{props.label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------

interface SubmitProps {
  visible: boolean;
  answered: number;
  total: number;
  blank: number;
  raguCount: number;
  secondsLeft: number;
  onCancel: () => void;
  onConfirm: () => void;
}

function SubmitModal(p: SubmitProps) {
  return (
    <Modal visible={p.visible} transparent animationType="fade" onRequestClose={p.onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalBadge}>
            <Svg style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="tkdSubmit" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={colors.academyAkademikStart} />
                  <Stop offset="1" stopColor={colors.academyAkademikEnd} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" rx={32} fill="url(#tkdSubmit)" />
            </Svg>
            <Icon name="check" size={28} color={colors.primaryForeground} />
          </View>
          <Text style={styles.modalTitle}>Kumpulkan Jawaban?</Text>
          <Text style={styles.modalMsg}>
            Kamu sudah menjawab{' '}
            <Text style={styles.mSuccess}>
              {p.answered} dari {p.total} soal
            </Text>
            .{' '}
            {p.blank > 0 ? (
              <Text>
                <Text style={styles.mDanger}>{p.blank} soal</Text> belum dijawab dan{' '}
              </Text>
            ) : (
              'Jawaban '
            )}
            tidak dapat diubah setelah dikumpulkan.
          </Text>

          <View style={styles.modalStats}>
            <View style={[styles.modalStat, { backgroundColor: colors.neutralSurface }]}>
              <Text style={styles.modalStatLabel}>SISA WAKTU</Text>
              <Text style={styles.modalStatValue}>{formatClock(p.secondsLeft)}</Text>
            </View>
            <View style={[styles.modalStat, { backgroundColor: colors.academyWarnSurface }]}>
              <Text style={[styles.modalStatLabel, { color: colors.warningText }]}>RAGU-RAGU</Text>
              <Text style={[styles.modalStatValue, { color: colors.warningText }]}>
                {p.raguCount} soal
              </Text>
            </View>
          </View>

          <View style={styles.modalActions}>
            <PressableScale scaleTo={0.98} onPress={p.onCancel} contentStyle={styles.modalGhost}>
              <Text style={styles.modalGhostText}>Periksa Lagi</Text>
            </PressableScale>
            <GradientButton
              tone="akademik"
              label="Ya, Kumpulkan"
              height={48}
              style={styles.modalConfirm}
              onPress={p.onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pageGradientStart },
  flex1: { flex: 1 },
  missing: { padding: 24, fontSize: 14, color: colors.textMuted },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.heading },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  timerRed: { backgroundColor: colors.dangerSurfaceSoft, borderColor: colors.dangerBorderSoft },
  timerAmber: { backgroundColor: colors.academyWarnSurface, borderColor: colors.academyWarnBorder },
  timerText: { fontSize: 11, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 120 },
  stack: { gap: 14 },
  subBar: {
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: colors.academyExamBarSurface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subBarLeft: { flex: 1, minWidth: 0 },
  subBarKicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.academyHeroLabel,
  },
  subBarName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primaryForeground,
    marginTop: 2,
  },
  subBarRight: { alignItems: 'flex-end' },
  subBarCount: { fontSize: 18, fontWeight: '800', color: colors.primaryForeground },
  subBarCountTotal: { fontSize: 13, color: colors.academyHeroLabel, fontWeight: '600' },
  subBarSub: { fontSize: 10, fontWeight: '600', color: colors.academyHeroLabel },
  progressTrack: { height: 6, borderRadius: 999, backgroundColor: colors.chipSurface, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.academyAkademikEnd },
  tkpNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.chipSurface,
  },
  tkpNoteText: { flex: 1, fontSize: 11, fontWeight: '600', color: colors.textBody, lineHeight: 16 },
  tkpBold: { fontWeight: '800', color: colors.heading },
  qCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  qMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  qChip: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: colors.chipSurface,
  },
  qChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: colors.primary },
  qHint: { fontSize: 11, fontWeight: '600', color: colors.placeholder },
  qPrompt: { fontSize: 14, fontWeight: '600', color: colors.heading, lineHeight: 21 },
  options: { gap: 10 },
  opt: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  optOn: { borderColor: colors.academyAkademikEnd, borderWidth: 2, backgroundColor: colors.academyAkademikSurface },
  optKey: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chipSurface,
    overflow: 'hidden',
  },
  optKeyOn: { backgroundColor: colors.academyAkademikEnd },
  optKeyText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  optKeyTextOn: { color: colors.primaryForeground },
  optText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.heading, lineHeight: 19 },
  raguRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  raguRowOn: { borderColor: colors.academyWarnBorder, backgroundColor: colors.academyWarnSurface },
  raguLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  raguText: { fontSize: 12, fontWeight: '700' },
  switch: {
    width: 40,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.borderSoft,
    padding: 2,
    justifyContent: 'center',
  },
  switchOn: { backgroundColor: colors.warning },
  knob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surface,
  },
  knobOn: { alignSelf: 'flex-end' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.floatingSurface,
    ...tabBarShadow,
  },
  navBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevBtn: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnDisabled: { opacity: 0.45 },
  prevText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  flip: { transform: [{ scaleX: -1 }] },
  nextWrap: { flex: 1.2, borderRadius: 999, backgroundColor: colors.academyAkademikEnd, shadowColor: colors.academyAkademikEnd, shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  nextBtn: {
    height: 52,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  nextText: { fontSize: 14, fontWeight: '700', color: colors.primaryForeground },
  // Overlay
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.pageGradientStart,
    zIndex: 20,
  },
  overlayInner: { flex: 1 },
  overlayFooter: {
    position: 'relative',
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingBottom: 16,
  },
  overlayFooterInner: { gap: 8 },
  footerNote: { fontSize: 11, fontWeight: '600', color: colors.placeholder, textAlign: 'center' },
  navStatRow: { flexDirection: 'row', gap: 10 },
  navStat: {
    flex: 1,
    padding: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    alignItems: 'center',
    ...cardShadow,
  },
  navStatLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: colors.placeholder },
  navStatValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  segment: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 999,
    backgroundColor: colors.chipSurface,
  },
  segmentItem: {
    flex: 1,
    height: 34,
    // borderRadius 999 diklamp ke setengah tinggi (17) → kapsul rapi. `overflow: hidden` membuat
    // SVG gradient ikut terpotong bentuk kapsul (bukan pakai <Rect rx> yang bikin elips lancip).
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  segmentItemOn: {
    // Fallback sebelum SVG gradient ter-paint; overflow-hidden bikin shadow ke-clip di Android,
    // jadi tidak pakai shadow di sini (track chip-nya sudah memberi kontras cukup).
    backgroundColor: colors.academyAkademikEnd,
  },
  segmentText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  segmentTextOn: { color: colors.primaryForeground, fontWeight: '700' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendChip: { width: 14, height: 14, borderRadius: 5, borderWidth: 1 },
  legendText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  gridCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  gridHead: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.placeholder,
    marginBottom: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  cell: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellDone: { backgroundColor: colors.academyAkademikSurface, borderColor: colors.academyAkademikBorder },
  cellRagu: { backgroundColor: colors.academyWarnSurface, borderColor: colors.academyWarnBorder },
  cellNow: { backgroundColor: colors.academyHeroSurface, borderColor: colors.academyHeroSurface },
  cellText: { fontSize: 14, fontWeight: '800', color: colors.placeholder },
  cellTextDone: { color: colors.academyAkademikText },
  cellTextRagu: { color: colors.warningText },
  cellTextNow: { color: colors.primaryForeground },
  // Submit modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
  },
  modalBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 6,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.heading, textAlign: 'center' },
  modalMsg: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  modalStats: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 12 },
  modalStat: { flex: 1, padding: 10, borderRadius: 14, alignItems: 'center' },
  modalStatLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: colors.placeholder },
  modalStatValue: { fontSize: 15, fontWeight: '800', color: colors.heading, marginTop: 2 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16, width: '100%' },
  modalGhost: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalGhostText: { fontSize: 15, fontWeight: '600', color: colors.heading },
  modalConfirm: { flex: 1 },
  mSuccess: { color: colors.success, fontWeight: '700' },
  mDanger: { color: colors.danger, fontWeight: '700' },
});
