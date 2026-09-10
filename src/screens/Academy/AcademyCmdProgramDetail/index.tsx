import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Badge from '@/components/atoms/Badge';
import Card from '@/components/molecules/Card';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import AcademyScreen from '@/screens/Academy/shared/AcademyScreen';
import { getAcademyProgramApi } from '@/services/api/academy.service';
import { colors } from '@/theme/colors';
import type { AcademyProgramDetail } from '@/types';
import { extractErrorMessage, formatDateShort, joinFields, orDash } from '@/utils/format';
import { componentStatusBadge, componentTypeLabel } from '@/utils/academy';

type Props = RootStackScreenProps<typeof ROUTES.academyCmdProgramDetail>;

export default function AcademyCmdProgramDetailScreen(props: Props) {
  const { navigation, route } = props;
  const { programId, title } = route.params;

  const [detail, setDetail] = useState<AcademyProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDetail(await getAcademyProgramApi(programId));
    } catch (e) {
      setError(extractErrorMessage(e, 'Data gagal dimuat.'));
    }
    setLoading(false);
  }, [programId]);

  useEffect(() => {
    load();
  }, [load]);

  const components = (detail?.components ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const primaryInstructor = detail?.instructors?.find(i => i.is_primary) ?? detail?.instructors?.[0];
  const period =
    detail?.start_date && detail?.end_date
      ? `${formatDateShort(detail.start_date)} – ${formatDateShort(detail.end_date)}`
      : detail?.completion_deadline
        ? formatDateShort(detail.completion_deadline)
        : '-';

  return (
    <AcademyScreen
      title={detail?.title ?? title ?? 'Program'}
      subtitle={detail ? joinFields(componentTypeLabel(detail.program_type), detail.code) : undefined}
      onBack={() => navigation.goBack()}
      loading={loading}
      error={error}
      onRetry={load}>
      {detail ? (
        <>
          <Card style={styles.infoCard}>
            <InfoRow label="Kategori" value={orDash(detail.category_name)} />
            <InfoRow label="Instruktur" value={orDash(primaryInstructor?.name)} />
            <InfoRow label="Periode" value={period} />
            <InfoRow
              label="Wajib"
              value={detail.is_mandatory ? 'Ya' : 'Tidak'}
              last
            />
          </Card>

          {detail.description ? (
            <>
              <Text style={styles.sectionLabel}>TENTANG PROGRAM</Text>
              <Text style={styles.body}>{orDash(detail.description)}</Text>
            </>
          ) : null}

          <Text style={styles.sectionLabel}>KURIKULUM</Text>
          <Card style={styles.listCard}>
            {components.length === 0 ? (
              <Text style={styles.emptyRow}>Belum ada komponen kurikulum.</Text>
            ) : (
              components.map((component, index) => {
                const badge = componentStatusBadge(component);
                return (
                  <View
                    key={component.id}
                    style={[styles.row, index < components.length - 1 && styles.rowBorder]}>
                    <View style={styles.flex}>
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {component.title}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {componentTypeLabel(component.type)}
                        {component.is_required ? ' · wajib' : ''}
                      </Text>
                    </View>
                    <Badge label={badge.label} variant={badge.variant} style={styles.badge} />
                  </View>
                );
              })
            )}
          </Card>
        </>
      ) : null}
    </AcademyScreen>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  infoCard: { paddingHorizontal: 16, paddingVertical: 2 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { fontSize: 13, color: colors.textMuted },
  infoValue: { fontSize: 14, fontWeight: '700', color: colors.heading, flexShrink: 1, textAlign: 'right' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.primary,
    marginTop: 12,
  },
  body: { fontSize: 13, lineHeight: 20, color: colors.textBody },
  listCard: { paddingHorizontal: 16, paddingVertical: 2 },
  emptyRow: { fontSize: 13, color: colors.textMuted, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.heading },
  rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge: { alignSelf: 'center' },
});
