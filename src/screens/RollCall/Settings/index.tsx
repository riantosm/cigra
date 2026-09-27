import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import GradientIconChip from '@/components/atoms/GradientIconChip';
import type { IconName } from '@/components/atoms/Icon';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  getRollCallOfficersApi,
  getRollCallRepresentativesApi,
  getRollCallSessionTypesApi,
} from '@/services/api/rollCall.service';
import { colors } from '@/theme/colors';
import { InfoCallout, sharedStyles } from '@/screens/RollCall/shared';

type Props = RootStackScreenProps<typeof ROUTES.rollCallSettings>;

interface ActiveCount {
  active: number;
  inactive: number;
}

function countOf(items: { is_active: boolean }[]): ActiveCount {
  const active = items.filter(item => item.is_active).length;
  return { active, inactive: items.length - active };
}

// Hub "Pengaturan Apel" (persiapan): sesi piket, petugas piket, perwakilan kompi. Jumlah aktif
// diambil paralel; satu endpoint gagal tidak menyembunyikan menu lain.
export default function RollCallSettingsScreen(props: Props) {
  const { navigation } = props;
  const [sessions, setSessions] = useState<ActiveCount | null>(null);
  const [officers, setOfficers] = useState<ActiveCount | null>(null);
  const [representatives, setRepresentatives] = useState<ActiveCount | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.allSettled([
        getRollCallSessionTypesApi(),
        getRollCallOfficersApi(),
        getRollCallRepresentativesApi(),
      ]).then(([sessionResult, officerResult, repResult]) => {
        setSessions(sessionResult.status === 'fulfilled' ? countOf(sessionResult.value) : null);
        setOfficers(officerResult.status === 'fulfilled' ? countOf(officerResult.value) : null);
        setRepresentatives(repResult.status === 'fulfilled' ? countOf(repResult.value) : null);
      });
    }, []),
  );

  return (
    <MainLayout
      title="Pengaturan Apel"
      subtitle="Disiapkan sekali, diubah bila ada pergantian"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <ScrollView contentContainerStyle={[sharedStyles.scrollContent, styles.content]}>
        <SettingsCard
          icon="clock"
          gradient={[colors.gradientPrimaryStart, colors.gradientPrimaryEnd]}
          title="Sesi Piket"
          description="Nama sesi dan jamnya, dipakai saat membuka agenda"
          count={sessions}
          onPress={() => navigation.navigate(ROUTES.rollCallSessions)}
        />
        <SettingsCard
          icon="shield-check"
          gradient={[colors.gradientWeaponStart, colors.gradientWeaponEnd]}
          title="Petugas Piket Batalyon"
          description="Membuka dan menutup agenda apel. Ditunjuk oleh komandan."
          count={officers}
          onPress={() => navigation.navigate(ROUTES.rollCallOfficers)}
        />
        <SettingsCard
          icon="users"
          gradient={[colors.gradientHealthStart, colors.gradientHealthEnd]}
          title="Perwakilan Kompi"
          description="Satu orang per kompi yang mengisi kehadiran satuannya"
          count={representatives}
          onPress={() => navigation.navigate(ROUTES.rollCallRepresentatives)}
        />
        <InfoCallout
          icon="info"
          text="Orang yang ditunjuk otomatis mendapat akses menu apel sesuai tugasnya, dan kehilangan akses itu saat penugasannya dinonaktifkan atau diakhiri."
          style={styles.callout}
        />
      </ScrollView>
    </MainLayout>
  );
}

function SettingsCard(props: {
  icon: IconName;
  gradient: readonly [string, string];
  title: string;
  description: string;
  count: ActiveCount | null;
  onPress: () => void;
}) {
  const { icon, gradient, title, description, count, onPress } = props;
  return (
    <PressableScale scaleTo={0.98} onPress={onPress} contentStyle={[sharedStyles.card, styles.card]}>
      <GradientIconChip icon={icon} colors={gradient} size={44} iconSize={22} radius={12} />
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {count ? (
          <Text style={styles.count}>
            {count.active} aktif
            {count.inactive > 0 ? <Text style={styles.countMuted}> · {count.inactive} nonaktif</Text> : null}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-right" size={18} color={colors.placeholder} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  body: { flex: 1, gap: 3 },
  title: { fontSize: 15, fontWeight: '700', color: colors.heading },
  description: { fontSize: 12, lineHeight: 17, color: colors.textMuted },
  count: { fontSize: 12, fontWeight: '600', color: colors.heading, marginTop: 2 },
  countMuted: { fontWeight: '400', color: colors.placeholder },
  callout: { marginTop: 4 },
});
