import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { locationStatusMeta } from '@/components/molecules/LocationStatusBadge';
import SearchFilterBar from '@/components/molecules/SearchFilterBar';
import PersonnelMap from '@/components/organisms/PersonnelMap';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getLocationsOverviewApi } from '@/services/api/location.service';
import { colors } from '@/theme/colors';
import { smallButtonShadow } from '@/theme/shadows';
import { extractErrorMessage } from '@/utils/format';
import { navigateOrBack } from '@/utils/navigation';
import type { LocationStatus, PersonnelLocationOverviewItem } from '@/types';

type Props = RootStackScreenProps<'PersonnelMap'>;

const LEGEND_ORDER: LocationStatus[] = ['fresh', 'stale', 'offline'];

export default function PersonnelMapScreen(props: Props) {
  const { navigation } = props;
  const [personnel, setPersonnel] = useState<PersonnelLocationOverviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async (mode: 'initial' | 'silent' = 'initial') => {
    if (mode === 'initial') {
      setIsLoading(true);
      setErrorMessage(null);
    }
    try {
      // per_page besar — daftar ini dipakai buat nampilin semua marker di peta sekaligus, bukan
      // list berpaginasi, jadi tidak ada UI "muat lagi" untuk halaman selanjutnya.
      const result = await getLocationsOverviewApi({ per_page: 50 });
      setPersonnel(result.items);
    } catch (error) {
      // Polling diam-diam (`silent`) tidak boleh mengganti peta yang sudah tampil jadi pesan
      // error — biarkan marker lama tetap kelihatan, coba lagi menit berikutnya.
      if (mode === 'initial') setErrorMessage(extractErrorMessage(error, 'Gagal memuat data lokasi personel.'));
    } finally {
      if (mode === 'initial') setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load('initial');
  }, [load]);

  const isFocused = useIsFocused();
  useEffect(() => {
    // Polling posisi tiap menit selagi layar ini aktif — sama seperti tab "Lokasi" di detail
    // personel/persit (`usePersonnelLocation`) & layar Lokasi Personel. Dijeda saat layar tidak
    // fokus (mis. sedang di detail personel) supaya tidak boros request untuk layar tidak terlihat.
    if (!isFocused) return undefined;
    const intervalId = setInterval(() => load('silent'), 60_000);
    return () => clearInterval(intervalId);
  }, [isFocused, load]);

  const counts = useMemo(() => {
    const base: Record<LocationStatus, number> = { fresh: 0, stale: 0, offline: 0 };
    for (const item of personnel) base[item.status] += 1;
    return base;
  }, [personnel]);

  const filteredPersonnel = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return personnel;
    return personnel.filter(
      item =>
        item.full_name.toLowerCase().includes(q) ||
        item.service_number.toLowerCase().includes(q),
    );
  }, [personnel, query]);

  return (
    <MainLayout
      title="Peta Personel"
      subtitle="Posisi real-time seluruh personel"
      variant="canvas"
      onBack={() => navigation.goBack()}
      right={
        <PressableScale
          onPress={() => navigateOrBack(navigation, ROUTES.personnelTracking)}
          hitSlop={12}
          contentStyle={styles.headerAction}
          accessibilityRole="button"
          accessibilityLabel="Lihat daftar Lokasi Personel">
          <Icon name="users" size={20} color={colors.primary} />
        </PressableScale>
      }>
      <View style={styles.container}>
        {isLoading ? (
          <ActivityIndicator style={styles.centerState} color={colors.primary} />
        ) : errorMessage ? (
          <Text style={styles.centerState}>{errorMessage}</Text>
        ) : (
          <View style={styles.mapWrap}>
            <PersonnelMap
              personnel={filteredPersonnel}
              interactive
              onSelectPersonnel={item =>
                navigation.navigate(ROUTES.catalogDetail, { resource: 'personnel', id: item.service_number })
              }
            />
            <View style={styles.overlayTop}>
              <SearchFilterBar
                value={query}
                onChangeText={setQuery}
                onClear={() => setQuery('')}
                placeholder="Cari nama atau NRP…"
              />
              <View style={styles.statusBar}>
                {LEGEND_ORDER.map(status => (
                  <View
                    key={status}
                    style={[styles.statusChip, { backgroundColor: locationStatusMeta[status].surface }]}>
                    <View style={[styles.statusDot, { backgroundColor: locationStatusMeta[status].color }]} />
                    <Text style={[styles.statusChipLabel, { color: locationStatusMeta[status].color }]}>
                      {locationStatusMeta[status].label} · {counts[status]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...smallButtonShadow,
  },
  container: {
    flex: 1,
  },
  mapWrap: {
    flex: 1,
  },
  overlayTop: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 16,
    gap: 12,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.floatingSurface,
    ...smallButtonShadow,
  },
  statusChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 999,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusChipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  centerState: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 14,
    color: colors.textMuted,
  },
});
