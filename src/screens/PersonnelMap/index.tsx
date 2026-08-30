import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import PersonnelMap from '@/components/organisms/PersonnelMap';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getLocationsOverviewApi } from '@/services/api/location.service';
import { colors } from '@/theme/colors';
import { extractErrorMessage } from '@/utils/format';
import type { PersonnelLocationOverviewItem } from '@/types';

type Props = RootStackScreenProps<'PersonnelMap'>;

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

  return (
    <MainLayout title="Peta Personel" onBack={() => navigation.goBack()}>
      <View style={styles.container}>
        {isLoading ? (
          <ActivityIndicator style={styles.centerState} color={colors.primary} />
        ) : errorMessage ? (
          <Text style={styles.centerState}>{errorMessage}</Text>
        ) : (
          <PersonnelMap
            personnel={personnel}
            interactive
            onSelectPersonnel={item =>
              navigation.navigate(ROUTES.catalogDetail, { resource: 'personnel', id: item.service_number })
            }
          />
        )}
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerState: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 14,
    color: colors.textMuted,
  },
});
