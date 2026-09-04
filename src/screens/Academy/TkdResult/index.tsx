import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { MotiView } from 'moti';

import Icon from '@/components/atoms/Icon';
import GradientButton from '@/components/atoms/GradientButton';
import PressableScale from '@/components/atoms/PressableScale';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import TkdScaffold from '@/screens/Academy/tkd/TkdScaffold';
import { getTkdModule, scoreTkd, type TkdSubtestResult } from '@/screens/Academy/tkd/data';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import { contentEnterTransition } from '@/utils/motion';

export type TkdResultScreenProps = RootStackScreenProps<typeof ROUTES.academyTkdResult>;

export default function TkdResultScreen(props: TkdResultScreenProps) {
  const { navigation, route } = props;
  const { moduleId, answers, elapsedSeconds } = route.params;
  const module = getTkdModule(moduleId);

  if (!module) {
    return (
      <TkdScaffold title="Hasil Tryout" onBack={() => navigation.goBack()}>
        <Text style={styles.missing}>Modul tidak ditemukan.</Text>
      </TkdScaffold>
    );
  }

  const result = scoreTkd(module, answers, elapsedSeconds);
  const failed = result.subtests.filter(s => !s.passed);
  const minutes = Math.max(1, Math.round(result.elapsedSeconds / 60));

  const failedNames =
    failed.length === 1
      ? failed[0].subtest
      : `${failed.slice(0, -1).map(f => f.subtest).join(', ')} dan ${failed[failed.length - 1]?.subtest}`;
  const summary = result.passed
    ? `Semua ${result.subtests.length} subkategori memenuhi ambang batas. Kerja bagus!`
    : `${result.subtests.length - failed.length} dari ${result.subtests.length} subkategori memenuhi ambang batas. ${failedNames} masih di bawah nilai minimum.`;

  return (
    <TkdScaffold
      title="Hasil Tryout"
      onBack={() => navigation.goBack()}
      footer={
        <View style={styles.footerStack}>
          <GradientButton
            tone="akademik"
            icon="eye"
            label="Lihat Pembahasan"
            height={52}
            onPress={() => navigation.navigate(ROUTES.academyTkdReview, route.params)}
          />
          <PressableScale
            scaleTo={0.98}
            onPress={() => navigation.navigate(ROUTES.academyRoot)}
            contentStyle={styles.ghost}>
            <Text style={styles.ghostText}>Kembali ke Akademik</Text>
          </PressableScale>
        </View>
      }>
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={contentEnterTransition}
        style={styles.stack}>
        <View style={styles.hero}>
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <RadialGradient id="tkdResultGlow" cx="82%" cy="0%" r="95%">
                <Stop offset="0" stopColor={colors.academyAkademikGlow} />
                <Stop offset="0.55" stopColor={colors.academyAkademikGlow} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#tkdResultGlow)" />
          </Svg>

          <View style={styles.heroTop}>
            <Text style={styles.heroKicker}>{module.fullTitle.toUpperCase()} · SELESAI</Text>
            <View style={[styles.verdict, result.passed ? styles.verdictPass : styles.verdictFail]}>
              <Text
                style={[
                  styles.verdictText,
                  { color: result.passed ? colors.success : colors.dangerMuted },
                ]}>
                {result.passed ? 'LULUS' : 'BELUM LULUS'}
              </Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreValue}>{result.totalScore}</Text>
            <Text style={styles.scoreMax}>skor total · maks {result.maxScore}</Text>
          </View>
          <Text style={styles.heroSummary}>{summary}</Text>
        </View>

        <View style={styles.statRow}>
          <StatCard label="BENAR" value={result.correct} color={colors.success} />
          <StatCard label="SALAH" value={result.wrong} color={colors.danger} />
          <StatCard label="KOSONG" value={result.blank} color={colors.placeholder} />
          <StatCard label="WAKTU" value={`${minutes}'`} color={colors.heading} />
        </View>

        <Text style={styles.sectionLabel}>RINCIAN PER SUBKATEGORI</Text>

        {result.subtests.map(sub => (
          <SubtestCard key={sub.subtest} sub={sub} />
        ))}

        {failed.length > 0 ? (
          <View style={styles.focusCard}>
            <Icon name="alert-triangle" size={18} color={colors.warningText} />
            <Text style={styles.focusText}>
              <Text style={styles.focusBold}>
                Fokus latihan berikutnya: {failed.map(f => f.subtest).join(', ')}.
              </Text>{' '}
              Perbanyak latihan pada subkategori tersebut untuk menembus ambang batas.
            </Text>
          </View>
        ) : null}
      </MotiView>
    </TkdScaffold>
  );
}

function StatCard(props: { label: string; value: number | string; color: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{props.label}</Text>
      <Text style={[styles.statValue, { color: props.color }]}>{props.value}</Text>
    </View>
  );
}

function SubtestCard({ sub }: { sub: TkdSubtestResult }) {
  const fillPct = sub.maxScore > 0 ? (sub.score / sub.maxScore) * 100 : 0;
  const ambPct = sub.maxScore > 0 ? (sub.config.threshold / sub.maxScore) * 100 : 0;
  const short = sub.score - sub.config.threshold;
  return (
    <View style={[styles.subCard, !sub.passed && styles.subCardFail]}>
      <View style={styles.subTop}>
        <View style={styles.subNameGroup}>
          <Text style={styles.subName}>{sub.subtest}</Text>
          <Text style={styles.subDesc}>
            {sub.config.description} · {sub.total} soal
          </Text>
        </View>
        <View style={styles.subScoreGroup}>
          <Text
            style={[styles.subScore, { color: sub.passed ? colors.success : colors.danger }]}>
            {sub.score}
          </Text>
          <View
            style={[
              styles.subBadge,
              { backgroundColor: sub.passed ? colors.successSurfaceSubtle : colors.dangerSurfaceSoft },
            ]}>
            <Icon
              name={sub.passed ? 'check' : 'close'}
              size={10}
              color={sub.passed ? colors.success : colors.danger}
            />
            <Text
              style={[
                styles.subBadgeText,
                { color: sub.passed ? colors.success : colors.danger },
              ]}>
              {sub.passed ? 'LULUS' : 'TIDAK LULUS'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.bar}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.min(100, fillPct)}%`,
              backgroundColor: sub.passed ? colors.success : colors.danger,
            },
          ]}
        />
        <View style={[styles.ambMark, { left: `${Math.min(100, ambPct)}%` }]} />
      </View>
      <Text style={styles.ambLabel}>
        ambang batas {sub.config.threshold} · skor kamu {sub.score}
        {!sub.passed ? (
          <Text style={styles.ambShort}> · kurang {Math.abs(short)}</Text>
        ) : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  missing: { padding: 24, fontSize: 14, color: colors.textMuted },
  stack: { gap: 14 },
  hero: {
    borderRadius: 22,
    padding: 20,
    overflow: 'hidden',
    backgroundColor: colors.academyHeroSurface,
    shadowColor: colors.academyHeroSurface,
    shadowOpacity: 0.32,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  heroKicker: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.academyHeroLabel,
  },
  verdict: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  verdictPass: { backgroundColor: colors.academyVerdictPassSurface },
  verdictFail: { backgroundColor: colors.academyVerdictFailSurface },
  verdictText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 14 },
  scoreValue: { fontSize: 46, fontWeight: '800', letterSpacing: -1.5, color: colors.primaryForeground, lineHeight: 46 },
  scoreMax: { fontSize: 13, color: colors.academyHeroBody, paddingBottom: 6 },
  heroSummary: { fontSize: 12, lineHeight: 17, color: colors.academyHeroBody, marginTop: 10 },
  statRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    padding: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    alignItems: 'center',
    ...cardShadow,
  },
  statLabel: { fontSize: 10, fontWeight: '700', color: colors.placeholder },
  statValue: { fontSize: 17, fontWeight: '800', marginTop: 2 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.placeholder,
    marginTop: 4,
    marginLeft: 2,
  },
  subCard: {
    padding: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  subCardFail: { borderColor: colors.dangerBorderSoft },
  subTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subNameGroup: { flex: 1, minWidth: 0 },
  subName: { fontSize: 14, fontWeight: '800', color: colors.heading },
  subDesc: { fontSize: 11, color: colors.placeholder, marginTop: 1 },
  subScoreGroup: { alignItems: 'flex-end', gap: 3 },
  subScore: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  subBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  subBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  bar: {
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.chipSurface,
    marginTop: 10,
    position: 'relative',
  },
  barFill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 999 },
  ambMark: { position: 'absolute', top: -3, bottom: -3, width: 2, backgroundColor: colors.text },
  ambLabel: { fontSize: 10, color: colors.placeholder, marginTop: 6 },
  ambShort: { color: colors.danger, fontWeight: '700' },
  focusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.academyWarnBorder,
    backgroundColor: colors.academyWarnSurface,
  },
  focusText: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.textMuted },
  focusBold: { color: colors.warningText, fontWeight: '700' },
  footerStack: { gap: 10 },
  ghost: {
    height: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
});
