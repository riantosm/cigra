import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { locationStatusMeta } from '@/components/molecules/LocationStatusBadge';
import PersonnelMap from '@/components/organisms/PersonnelMap';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getLocationsOverviewApi } from '@/services/api/location.service';
import { colors } from '@/theme/colors';
import { cardShadowRaised } from '@/theme/shadows';
import { extractErrorMessage } from '@/utils/format';
import type { LocationStatus, PersonnelLocationOverviewItem } from '@/types';

type Props = RootStackScreenProps<'PersonnelMap'>;

const LEGEND_ORDER: LocationStatus[] = ['fresh', 'stale', 'offline'];

export default function PersonnelMapScreen(props: Props) {
  const { navigation } = props;
  const [personnel, setPersonnel] = useState<PersonnelLocationOverviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // per_page besar — daftar ini dipakai buat nampilin semua marker di peta sekaligus, bukan
      // list berpaginasi, jadi tidak ada UI "muat lagi" untuk halaman selanjutnya.
      const result = await getLocationsOverviewApi({ per_page: 50 });
      setPersonnel(result.items);
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Gagal memuat data lokasi personel.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const base: Record<LocationStatus, number> = { fresh: 0, stale: 0, offline: 0 };
    for (const item of personnel) base[item.status] += 1;
    return base;
  }, [personnel]);

  return (
    <MainLayout
      title="Peta Personel"
      subtitle="Posisi real-time seluruh personel"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <View style={styles.container}>
        {isLoading ? (
          <ActivityIndicator style={styles.centerState} color={colors.primary} />
        ) : errorMessage ? (
          <Text style={styles.centerState}>{errorMessage}</Text>
        ) : (
          <View style={styles.mapWrap}>
            <PersonnelMap
              personnel={personnel}
              interactive
              onSelectPersonnel={item =>
                navigation.navigate(ROUTES.catalogDetail, { resource: 'personnel', id: item.service_number })
              }
            />
            <View style={styles.legend} pointerEvents="none">
              {LEGEND_ORDER.map(status => (
                <View key={status} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: locationStatusMeta[status].color }]} />
                  <Text style={styles.legendLabel}>
                    {locationStatusMeta[status].label} ({counts[status]})
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapWrap: {
    flex: 1,
  },
  legend: {
    position: 'absolute',
    left: 16,
    bottom: 20,
    gap: 8,
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.floatingSurface,
    ...cardShadowRaised,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  centerState: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 14,
    color: colors.textMuted,
  },
});
