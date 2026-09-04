import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { MotiView } from 'moti';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import TkdScaffold from '@/screens/Academy/tkd/TkdScaffold';
import { getTkdModule, scoreQuestion, type TkdQuestion } from '@/screens/Academy/tkd/data';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import { contentEnterTransition } from '@/utils/motion';

export type TkdReviewScreenProps = RootStackScreenProps<typeof ROUTES.academyTkdReview>;

type Filter = 'all' | 'wrong' | 'ragu';

function isWrong(q: TkdQuestion, answer: string | undefined): boolean {
  if (q.subtest === 'TKP') return false;
  return Boolean(answer) && answer !== q.answerKey;
}

export default function TkdReviewScreen(props: TkdReviewScreenProps) {
  const { navigation, route } = props;
  const { moduleId, answers, raguIds } = route.params;
  const module = getTkdModule(moduleId);
  const questions = useMemo(() => module?.questions ?? [], [module]);

  const wrongCount = questions.filter(q => isWrong(q, answers[q.id])).length;
  const [filter, setFilter] = useState<Filter>('all');
  const [pos, setPos] = useState(0);

  const filtered = useMemo(() => {
    if (filter === 'wrong') return questions.filter(q => isWrong(q, answers[q.id]));
    if (filter === 'ragu') return questions.filter(q => raguIds.includes(q.id));
    return questions;
  }, [filter, questions, answers, raguIds]);

  if (!module) {
    return (
      <TkdScaffold title="Pembahasan" onBack={() => navigation.goBack()}>
        <Text style={styles.missing}>Modul tidak ditemukan.</Text>
      </TkdScaffold>
    );
  }

  const changeFilter = (f: Filter) => {
    setFilter(f);
    setPos(0);
  };

  const q = filtered[Math.min(pos, filtered.length - 1)];
  const absoluteNo = q ? questions.findIndex(x => x.id === q.id) + 1 : 0;
  const answer = q ? answers[q.id] : undefined;
  const wrong = q ? isWrong(q, answer) : false;
  const isTkp = q?.subtest === 'TKP';

  const statusChip = !q
    ? null
    : isTkp
      ? { label: `NILAI JAWABANMU: ${scoreQuestion(q, answer)}`, bg: colors.chipSurface, fg: colors.primary }
      : !answer
        ? { label: 'TIDAK DIJAWAB', bg: colors.neutralSurface, fg: colors.textMuted }
        : wrong
          ? { label: 'JAWABANMU SALAH', bg: colors.dangerSurfaceSoft, fg: colors.danger }
          : { label: 'JAWABANMU BENAR', bg: colors.successSurfaceSubtle, fg: colors.success };

  return (
    <TkdScaffold
      title="Pembahasan"
      onBack={() => navigation.goBack()}
      headerRight={
        <Text style={styles.counter}>
          {filtered.length === 0 ? '0 / 0' : `${Math.min(pos + 1, filtered.length)} / ${filtered.length}`}
        </Text>
      }
      footer={
        <View style={styles.footerRow}>
          <PressableScale
            scaleTo={0.98}
            disabled={pos === 0}
            onPress={() => setPos(p => Math.max(0, p - 1))}
            style={styles.navFlex}
            contentStyle={[styles.navBtn, pos === 0 && styles.navDisabled]}>
            <View style={styles.flip}>
              <Icon name="chevron-right" size={16} color={colors.textMuted} />
            </View>
            <Text style={styles.navText}>Sebelumnya</Text>
          </PressableScale>
          <PressableScale
            scaleTo={0.98}
            disabled={pos >= filtered.length - 1}
            onPress={() => setPos(p => Math.min(filtered.length - 1, p + 1))}
            style={styles.navNextWrap}
            contentStyle={[styles.navBtnNext, pos >= filtered.length - 1 && styles.navDisabled]}>
            <Svg style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="tkdReviewNext" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={colors.academyAkademikStart} />
                  <Stop offset="1" stopColor={colors.academyAkademikEnd} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#tkdReviewNext)" />
            </Svg>
            <Text style={styles.navTextNext}>Selanjutnya</Text>
            <Icon name="chevron-right" size={16} color={colors.primaryForeground} />
          </PressableScale>
        </View>
      }>
      <View style={styles.filterRow}>
        <FilterChip label="Semua" active={filter === 'all'} onPress={() => changeFilter('all')} />
        <FilterChip
          label={`Salah · ${wrongCount}`}
          active={filter === 'wrong'}
          onPress={() => changeFilter('wrong')}
        />
        <FilterChip
          label={`Ragu · ${raguIds.length}`}
          active={filter === 'ragu'}
          onPress={() => changeFilter('ragu')}
        />
      </View>

      {!q ? (
        <View style={styles.emptyBox}>
          <Icon name="check" size={22} color={colors.success} />
          <Text style={styles.emptyText}>
            {filter === 'wrong'
              ? 'Tidak ada jawaban yang salah. Mantap!'
              : 'Tidak ada soal yang kamu tandai ragu-ragu.'}
          </Text>
        </View>
      ) : (
        <MotiView
          key={q.id}
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={contentEnterTransition}
          style={styles.stack}>
          <View style={styles.qCard}>
            <View style={styles.qMeta}>
              <View style={styles.qChip}>
                <Text style={styles.qChipText}>
                  {q.subtest} · SOAL {absoluteNo}
                </Text>
              </View>
              {statusChip ? (
                <View style={[styles.statusChip, { backgroundColor: statusChip.bg }]}>
                  <Text style={[styles.statusChipText, { color: statusChip.fg }]}>
                    {statusChip.label}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.qPrompt}>{q.prompt}</Text>
          </View>

          <View style={styles.options}>
            {q.options.map(opt => {
              const isKey = opt.key === q.answerKey;
              const isPick = opt.key === answer;
              const optStyle = [
                styles.opt,
                isKey && styles.optKey,
                isPick && !isKey && styles.optWrong,
              ];
              return (
                <View key={opt.key} style={optStyle}>
                  <View
                    style={[
                      styles.optKeyBadge,
                      isKey && styles.optKeyBadgeKey,
                      isPick && !isKey && styles.optKeyBadgeWrong,
                    ]}>
                    <Text
                      style={[
                        styles.optKeyText,
                        (isKey || (isPick && !isKey)) && styles.optKeyTextOn,
                      ]}>
                      {opt.key}
                    </Text>
                  </View>
                  <Text style={styles.optText}>
                    {opt.text}
                    {isTkp && opt.value != null ? (
                      <Text style={styles.optValue}> · nilai {opt.value}</Text>
                    ) : null}
                  </Text>
                  {isPick ? (
                    <View style={[styles.tag, styles.tagPick]}>
                      <Text style={[styles.tagText, { color: colors.danger }]}>PILIHANMU</Text>
                    </View>
                  ) : null}
                  {isKey ? (
                    <View style={[styles.tag, styles.tagKey]}>
                      <Text style={[styles.tagText, { color: colors.success }]}>KUNCI</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          <View style={styles.explainCard}>
            <View style={styles.explainHead}>
              <Icon name="info" size={15} color={colors.primary} />
              <Text style={styles.explainHeadText}>Pembahasan</Text>
            </View>
            <Text style={styles.explainBody}>{q.explanation}</Text>
            {q.tip ? (
              <View style={styles.tipBox}>
                <Text style={styles.tipText}>
                  <Text style={styles.tipLabel}>Tips: </Text>
                  {q.tip}
                </Text>
              </View>
            ) : null}
          </View>
        </MotiView>
      )}
    </TkdScaffold>
  );
}

function FilterChip(props: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={props.onPress}
      style={[styles.filterChip, props.active && styles.filterChipOn]}>
      <Text style={[styles.filterChipText, props.active && styles.filterChipTextOn]}>
        {props.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  missing: { padding: 24, fontSize: 14, color: colors.textMuted },
  counter: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  stack: { gap: 14 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  filterChipOn: { borderColor: colors.academyAkademikEnd, backgroundColor: colors.academyAkademikSurface },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  filterChipTextOn: { color: colors.academyAkademikText, fontWeight: '700' },
  emptyBox: {
    alignItems: 'center',
    gap: 10,
    padding: 40,
    paddingHorizontal: 24,
  },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  qCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  qMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  qChip: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: colors.chipSurface,
  },
  qChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: colors.primary },
  statusChip: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999 },
  statusChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  qPrompt: { fontSize: 14, fontWeight: '600', color: colors.heading, lineHeight: 21 },
  options: { gap: 9 },
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  optKey: { borderColor: colors.success, backgroundColor: colors.successSurfaceSubtle },
  optWrong: { borderColor: colors.dangerMuted, backgroundColor: colors.dangerSurfaceSoft },
  optKeyBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chipSurface,
  },
  optKeyBadgeKey: { backgroundColor: colors.success },
  optKeyBadgeWrong: { backgroundColor: colors.danger },
  optKeyText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  optKeyTextOn: { color: colors.primaryForeground },
  optText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.heading, lineHeight: 19 },
  optValue: { color: colors.textMuted, fontWeight: '700' },
  tag: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: 999 },
  tagPick: { backgroundColor: colors.dangerSurface },
  tagKey: { backgroundColor: colors.successSurface },
  tagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  explainCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  explainHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  explainHeadText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  explainBody: { fontSize: 13, lineHeight: 20, color: colors.textBody },
  tipBox: {
    marginTop: 10,
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.chipSurface,
  },
  tipText: { fontSize: 12, lineHeight: 17, color: colors.textBody },
  tipLabel: { fontWeight: '800', color: colors.primary },
  footerRow: { flexDirection: 'row', gap: 10 },
  navFlex: { flex: 1 },
  navBtn: {
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
  navNextWrap: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: colors.academyAkademikEnd,
    shadowColor: colors.academyAkademikEnd,
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  navBtnNext: {
    height: 52,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  navDisabled: { opacity: 0.45 },
  navText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  navTextNext: { fontSize: 14, fontWeight: '700', color: colors.primaryForeground },
  flip: { transform: [{ scaleX: -1 }] },
});
