import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Badge from '@/components/atoms/Badge';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import AcademyScreen from '@/screens/Academy/shared/AcademyScreen';
import { getAcademyCompetenciesApi } from '@/services/api/academy.service';
import { colors } from '@/theme/colors';
import type { AcademyCompetency } from '@/types';
import { extractErrorMessage, formatDateShort } from '@/utils/format';
import { competencyStatusBadge, formatScore } from '@/utils/academy';

type Props = RootStackScreenProps<typeof ROUTES.academyCompetencyDetail>;

export default function AcademyCompetencyDetailScreen(props: Props) {
  const { navigation, route } = props;
  const { competencyId, name } = route.params;

  const [competency, setCompetency] = useState<AcademyCompetency | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getAcademyCompetenciesApi();
      setCompetency(rows.find(r => r.id === competencyId) ?? null);
    } catch (e) {
      setError(extractErrorMessage(e, 'Data gagal dimuat.'));
    }
    setLoading(false);
  }, [competencyId]);

  useEffect(() => {
    load();
  }, [load]);

  const badge = competency
    ? competencyStatusBadge(competency.status, competency.expires_at)
    : null;

  return (
    <AcademyScreen
      title={competency?.competency_name ?? name ?? 'Kompetensi'}
      subtitle={competency ? `Kategori ${competency.category}` : undefined}
      onBack={() => navigation.goBack()}
      loading={loading}
      error={error}
      onRetry={load}>
      {competency ? (
        <>
          <View style={styles.hero}>
            <Text style={styles.kicker}>SKOR SAAT INI</Text>
            <Text style={styles.score}>{formatScore(competency.score)}</Text>
            {badge ? <Badge label={badge.label} variant={badge.variant} /> : null}
          </View>

          <View style={styles.card}>
            <Row label="Diperoleh dari" value={competency.program_title ?? '-'} />
            <Row
              label="Tanggal capai"
              value={competency.achieved_at ? formatDateShort(competency.achieved_at) : '-'}
            />
            <Row
              label="Berlaku sampai"
              value={competency.expires_at ? formatDateShort(competency.expires_at) : '-'}
              last
            />
          </View>
        </>
      ) : (
        <Text style={styles.empty}>Kompetensi tidak ditemukan.</Text>
      )}
    </AcademyScreen>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: colors.placeholder },
  score: { fontSize: 46, fontWeight: '800', color: colors.heading, lineHeight: 50 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 14, color: colors.textMuted },
  rowValue: { fontSize: 14, fontWeight: '700', color: colors.heading, flexShrink: 1, textAlign: 'right' },
  empty: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: 24 },
});
