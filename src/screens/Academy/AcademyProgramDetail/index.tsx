import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Badge from '@/components/atoms/Badge';
import GradientButton from '@/components/atoms/GradientButton';
import GradientIconChip from '@/components/atoms/GradientIconChip';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import AcademyScreen from '@/screens/Academy/shared/AcademyScreen';
import { getAcademyProgramApi } from '@/services/api/academy.service';
import { colors } from '@/theme/colors';
import type { AcademyComponent, AcademyProgramDetail } from '@/types';
import { extractErrorMessage, formatDateShort, orDash } from '@/utils/format';
import { componentStatusBadge, componentTypeLabel, daysUntilLabel } from '@/utils/academy';

type Props = RootStackScreenProps<typeof ROUTES.academyProgramDetail>;

function isDone(component: AcademyComponent) {
  if (component.is_completed != null) return component.is_completed;
  return ['completed', 'selesai', 'passed', 'lulus'].includes((component.status ?? '').toLowerCase());
}

export default function AcademyProgramDetailScreen(props: Props) {
  const { navigation, route } = props;
  const { programId } = route.params;

  const [detail, setDetail] = useState<AcademyProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = useRef(true);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        setDetail(await getAcademyProgramApi(programId));
      } catch (e) {
        setError(extractErrorMessage(e, 'Data gagal dimuat.'));
      }
      setLoading(false);
      setRefreshing(false);
    },
    [programId],
  );

  useFocusEffect(
    useCallback(() => {
      load(first.current ? 'initial' : 'refresh');
      first.current = false;
    }, [load]),
  );

  const components = (detail?.components ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const progress = components.length
    ? Math.round((components.filter(isDone).length / components.length) * 100)
    : 0;

  function openComponent(component: AcademyComponent) {
    if (component.type === 'assessment' && component.assessment_id) {
      navigation.navigate(ROUTES.academyAssessmentIntro, {
        assessmentId: component.assessment_id,
        programId,
        title: component.title,
      });
    } else if (component.type === 'practical' && component.practical_id) {
      navigation.navigate(ROUTES.academyPracticalEntry, {
        practicalId: component.practical_id,
        programId,
        title: component.title,
      });
    } else if (component.type === 'material') {
      navigation.navigate(ROUTES.academyMaterial, {
        programId,
        componentId: component.id,
        materialId: component.material_id ?? undefined,
        title: component.title,
      });
    }
  }

  const nextComponent = components.find(c => !isDone(c));

  return (
    <AcademyScreen
      title={detail?.title ?? 'Program'}
      subtitle={detail ? `${componentTypeLabel(detail.program_type)} · ${detail.code}` : undefined}
      onBack={() => navigation.goBack()}
      loading={loading}
      error={error}
      onRetry={() => load('initial')}
      onRefresh={() => load('refresh')}
      refreshing={refreshing}
      footer={
        nextComponent ? (
          <GradientButton
            label={`Kerjakan ${nextComponent.title}`}
            onPress={() => openComponent(nextComponent)}
          />
        ) : undefined
      }>
      {detail ? (
        <>
          <View style={styles.metricRow}>
            <Card style={styles.metricCard}>
              <Text style={styles.metricLabel}>Progress</Text>
              <Text style={styles.metricValue}>{progress}%</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${progress}%` }]} />
              </View>
            </Card>
            <Card style={styles.metricCard}>
              <Text style={styles.metricLabel}>Deadline</Text>
              <Text style={styles.metricValueSm}>
                {detail.completion_deadline ? formatDateShort(detail.completion_deadline) : '-'}
              </Text>
              {detail.completion_deadline ? (
                <Text style={styles.metricHint}>{daysUntilLabel(detail.completion_deadline)}</Text>
              ) : null}
            </Card>
          </View>

          {detail.description ? (
            <>
              <Text style={styles.sectionLabel}>TENTANG PROGRAM</Text>
              <Text style={styles.body}>{orDash(detail.description)}</Text>
            </>
          ) : null}

          <Text style={styles.sectionLabel}>MATERI &amp; AKTIVITAS</Text>
          <Card style={styles.timelineCard}>
            {components.length === 0 ? (
              <Text style={styles.emptyRow}>Belum ada komponen kurikulum.</Text>
            ) : (
              components.map((component, index) => {
                const done = isDone(component);
                const badge = componentStatusBadge(component);
                return (
                  <PressableScale
                    key={component.id}
                    scaleTo={0.99}
                    onPress={() => openComponent(component)}>
                    <View
                      style={[
                        styles.tlRow,
                        index < components.length - 1 && styles.tlRowBorder,
                      ]}>
                      <View style={styles.tlRail}>
                        {done ? (
                          <GradientIconChip
                            icon="check"
                            colors={[colors.gradientSuccessStart, colors.success]}
                            size={24}
                            iconSize={13}
                            radius={12}
                          />
                        ) : (
                          <View style={[styles.tlNode, styles.tlNodeActive]} />
                        )}
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.tlTitle} numberOfLines={2}>
                          {component.title}
                        </Text>
                        <Text style={styles.tlMeta}>
                          {componentTypeLabel(component.type)}
                          {component.is_required ? ' · wajib' : ''}
                        </Text>
                        <Badge label={badge.label} variant={badge.variant} style={styles.tlBadge} />
                      </View>
                    </View>
                  </PressableScale>
                );
              })
            )}
          </Card>
        </>
      ) : null}
    </AcademyScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  metricRow: { flexDirection: 'row', gap: 12 },
  metricCard: { flex: 1, gap: 6 },
  metricLabel: { fontSize: 12, color: colors.textMuted },
  metricValue: { fontSize: 22, fontWeight: '800', color: colors.heading },
  metricValueSm: { fontSize: 16, fontWeight: '800', color: colors.heading, marginTop: 4 },
  metricHint: { fontSize: 12, color: colors.warningText, marginTop: 2 },
  track: { height: 6, borderRadius: 999, backgroundColor: colors.chipSurface, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, backgroundColor: colors.primary },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.primary,
    marginTop: 12,
  },
  body: { fontSize: 13, lineHeight: 20, color: colors.textBody },
  timelineCard: { paddingVertical: 4 },
  emptyRow: { fontSize: 13, color: colors.textMuted, paddingVertical: 12 },
  tlRow: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  tlRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  tlRail: { alignItems: 'center' },
  tlNode: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlNodeActive: { borderColor: colors.primary },
  tlTitle: { fontSize: 14, fontWeight: '700', color: colors.heading },
  tlMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  tlBadge: { alignSelf: 'flex-start', marginTop: 6 },
});
