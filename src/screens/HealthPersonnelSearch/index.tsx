import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import PersonAvatar from '@/components/molecules/PersonAvatar';
import SearchFilterBar from '@/components/molecules/SearchFilterBar';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { searchHealthPersonnelApi } from '@/services/api/health.service';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import type { HealthPersonnelSearchItem } from '@/types';
import { extractErrorMessage, joinFields } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.healthPersonnelSearch>;

const SEARCH_DEBOUNCE_MS = 1000;
const MIN_QUERY_LENGTH = 2;

// Cari anggota (nama/NRP) untuk petugas kesehatan. `mode: 'input'` → hasil menuju langsung ke
// form input pemeriksaan; default → menuju profil kesehatan anggota.
export default function HealthPersonnelSearchScreen(props: Props) {
  const { navigation, route } = props;
  const mode = route.params?.mode;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HealthPersonnelSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setHasSearched(false);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchHealthPersonnelApi(trimmed);
        if (requestIdRef.current === currentRequestId) {
          setResults(data);
          setErrorMessage(null);
        }
      } catch (error) {
        if (requestIdRef.current === currentRequestId) {
          setResults([]);
          setErrorMessage(extractErrorMessage(error, 'Gagal mencari anggota.'));
        }
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setIsLoading(false);
          setHasSearched(true);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  function handleSelect(item: HealthPersonnelSearchItem) {
    if (mode === 'input') {
      navigation.navigate(ROUTES.healthRecordInput, {
        nrp: item.service_number,
        personnelName: joinFields(item.rank, item.full_name) || item.full_name,
      });
    } else {
      navigation.navigate(ROUTES.healthPersonnelProfile, { nrp: item.service_number });
    }
  }

  return (
    <MainLayout
      title="Cari Anggota"
      subtitle={
        mode === 'input'
          ? 'Pilih personel untuk mencatat pemeriksaan'
          : 'Cari personel berdasarkan nama atau NRP'
      }
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <View style={styles.container}>
        <SearchFilterBar
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          placeholder="Nama atau NRP (min. 2 karakter)"
          autoFocus
          style={styles.search}
        />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <FlatList
          data={results}
          keyExtractor={item => String(item.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <PressableScale scaleTo={0.98} onPress={() => handleSelect(item)} contentStyle={styles.row}>
              <PersonAvatar photo={item.photo} name={item.full_name} size={44} />
              <View style={styles.rowBody}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {joinFields(item.rank, item.full_name) || item.full_name}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {joinFields(item.service_number, item.unit) || item.service_number}
                </Text>
              </View>
              <Icon name="chevron-right" size={18} color={colors.placeholder} />
            </PressableScale>
          )}
          ListEmptyComponent={
            <>
              {isLoading ? (
                <View style={styles.centered}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : query.trim().length < MIN_QUERY_LENGTH ? (
                <Text style={styles.hint}>Ketik minimal {MIN_QUERY_LENGTH} karakter untuk mencari.</Text>
              ) : hasSearched ? (
                <Text style={styles.hint}>Tidak ada anggota yang cocok.</Text>
              ) : null}
            </>
          }
        />
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  search: {
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 48,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.heading,
  },
  rowMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  centered: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
    marginBottom: 12,
  },
});
