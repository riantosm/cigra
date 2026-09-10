import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import Card from '@/components/molecules/Card';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import AcademyScreen from '@/screens/Academy/shared/AcademyScreen';
import { getAcademySummaryApi } from '@/services/api/academy.service';
import { colors } from '@/theme/colors';
import type { AcademySummaryCommander } from '@/types';
import { extractErrorMessage } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.academyCmdAttention>;

export default function AcademyCmdAttentionScreen(props: Props) {
  const { navigation } = props;
  const [data, setData] = useState<AcademySummaryCommander | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await getAcademySummaryApi();
      setData(summary.commander_overview ?? null);
    } catch (e) {
      setError(extractErrorMessage(e, 'Data gagal dimuat.'));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows: {
    key: string;
    icon: IconName;
    surface: string;
    color: string;
    title: string;
    sub: string;
    value: number;
  }[] = [
    {
      key: 'not_completed',
      icon: 'clipboard-check',
      surface: colors.warningSurface,
      color: colors.warningText,
      title: 'Program belum selesai',
      sub: 'Anggota yang belum menuntaskan program',
      value: data?.not_completed ?? 0,
    },
    {
      key: 'failed',
      icon: 'close',
      surface: colors.dangerSurface,
      color: colors.danger,
      title: 'Tidak lulus assessment',
      sub: 'Perlu remedial / pengulangan',
      value: data?.failed ?? 0,
    },
    {
      key: 'pending',
      icon: 'clock',
      surface: colors.primarySurface,
      color: colors.primary,
      title: 'Praktik belum diverifikasi',
      sub: 'Menunggu instruktur',
      value: data?.pending_verifications ?? 0,
    },
  ];

  return (
    <AcademyScreen
      title="Perlu Perhatian"
      subtitle="Hal yang perlu ditindaklanjuti"
      onBack={() => navigation.goBack()}
      loading={loading}
      error={error}
      onRetry={load}>
      {rows.map(row => (
        <Card key={row.key} style={styles.row}>
          <View style={[styles.icon, { backgroundColor: row.surface }]}>
            <Icon name={row.icon} size={19} color={row.color} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.title}>{row.title}</Text>
            <Text style={styles.sub}>{row.sub}</Text>
          </View>
          <Text style={styles.value}>{row.value}</Text>
        </Card>
      ))}
    </AcademyScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: colors.heading },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  value: { fontSize: 20, fontWeight: '800', color: colors.heading },
});
