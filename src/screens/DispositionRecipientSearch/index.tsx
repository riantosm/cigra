import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { CommonActions } from '@react-navigation/native';

import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import PersonAvatar from '@/components/molecules/PersonAvatar';
import SearchFilterBar from '@/components/molecules/SearchFilterBar';
import MainLayout from '@/components/templates/MainLayout';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { searchDispositionPersonnelApi } from '@/services/api/disposition.service';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import type { PersonnelSearchItem } from '@/types';
import { extractErrorMessage } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.dispositionRecipientSearch>;

const SEARCH_DEBOUNCE_MS = 1000;

export default function DispositionRecipientSearchScreen(props: Props) {
  const { navigation, route } = props;
  const keyboardHeight = useKeyboardHeight();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PersonnelSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Peta id → item terpilih (menyimpan objek supaya bisa dikirim balik walau hilang dari hasil).
  const [selected, setSelected] = useState<Record<number, PersonnelSearchItem>>({});
  const selectedIdsKey = route.params.selectedIds.join(',');

  // Seed / re-seed dari param `selectedIds` tiap kali layar ini dibuka dari Compose (id saja —
  // nama diisi belakangan saat muncul di hasil pencarian).
  useEffect(() => {
    setSelected(prev => {
      const seed: Record<number, PersonnelSearchItem> = {};
      route.params.selectedIds.forEach(id => {
        seed[id] = prev[id] ?? { id, full_name: `Anggota #${id}`, service_number: '' };
      });
      return seed;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdsKey]);

  useEffect(() => {
    const q = query.trim();
    setIsSearching(true);
    // Tanpa batas minimal huruf: query kosong = tampilkan semua anggota aktif.
    const timer = setTimeout(async () => {
      try {
        const items = await searchDispositionPersonnelApi(q);
        setResults(items);
        setErrorMessage(null);
        // Perbarui nama untuk yang sudah terpilih kalau muncul di hasil.
        setSelected(prev => {
          let changed = false;
          const next = { ...prev };
          items.forEach(item => {
            if (next[item.id] && next[item.id].service_number === '') {
              next[item.id] = item;
              changed = true;
            }
          });
          return changed ? next : prev;
        });
      } catch (error) {
        setResults([]);
        setErrorMessage(extractErrorMessage(error, 'Gagal memuat daftar anggota.'));
      } finally {
        setIsSearching(false);
      }
    }, q ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [query]);

  const selectedList = useMemo(() => Object.values(selected), [selected]);

  function toggle(item: PersonnelSearchItem) {
    setSelected(prev => {
      const next = { ...prev };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = item;
      return next;
    });
  }

  function confirm() {
    // Set param `recipients` di layar Compose (route sebelumnya) lalu kembali — pola resmi
    // "kirim data balik" RN. `setParams` MERGE, jadi `incomingLetter` / `dispositionId` aman.
    const state = navigation.getState();
    const prevRoute = state.routes[state.index - 1];
    if (prevRoute) {
      navigation.dispatch({
        ...CommonActions.setParams({ recipients: selectedList }),
        source: prevRoute.key,
      });
    }
    navigation.goBack();
  }

  return (
    <MainLayout
      title="Pilih Penerima"
      subtitle="Semua anggota aktif — cari nama atau NRP"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <View style={[styles.container, { paddingBottom: keyboardHeight }]}>
        <SearchFilterBar
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          placeholder="Cari personel..."
          autoFocus
          style={styles.search}
        />
        <Text style={styles.hint}>Pencarian anggota aktif secara real-time.</Text>

        {selectedList.length > 0 ? (
          <View style={styles.selectedWrap}>
            <Text style={styles.selectedLabel}>DIPILIH ({selectedList.length})</Text>
            <View style={styles.chipRow}>
              {selectedList.map(item => (
                <PressableScale
                  key={item.id}
                  scaleTo={0.94}
                  onPress={() => toggle(item)}
                  contentStyle={styles.selectedChip}>
                  <Text style={styles.selectedChipText} numberOfLines={1}>
                    {item.full_name}
                  </Text>
                  <Icon name="close" size={13} color={colors.primary} />
                </PressableScale>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.resultArea}>
          {isSearching ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : (
          <FlatList
            data={results}
            style={styles.flex}
            keyExtractor={item => String(item.id)}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const checked = Boolean(selected[item.id]);
              return (
                <PressableScale scaleTo={0.98} onPress={() => toggle(item)} contentStyle={styles.row}>
                  <PersonAvatar photo={item.photo} name={item.full_name} size={40} />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {item.full_name}
                    </Text>
                    {item.service_number ? (
                      <Text style={styles.rowMeta}>NRP {item.service_number}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                    {checked ? <Icon name="check" size={13} color={colors.primaryForeground} /> : null}
                  </View>
                </PressableScale>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {errorMessage ?? 'Tidak ada anggota yang cocok.'}
              </Text>
            }
          />
          )}
        </View>

        <View style={styles.footer}>
          <GradientButton
            label={`Tambahkan (${selectedList.length} Anggota)`}
            icon="check"
            onPress={confirm}
            disabled={selectedList.length === 0}
          />
        </View>
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  flex: { flex: 1 },
  resultArea: { flex: 1 },
  search: { marginBottom: 8 },
  hint: { fontSize: 11, color: colors.placeholder, marginBottom: 12, paddingLeft: 2 },
  selectedWrap: { gap: 8, marginBottom: 14 },
  selectedLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.chipSurface,
    borderWidth: 1,
    borderColor: colors.notifUnreadBorder,
    maxWidth: '100%',
  },
  selectedChipText: { flexShrink: 1, fontSize: 12, fontWeight: '600', color: colors.primary },
  loader: { marginTop: 40 },
  listContent: { paddingBottom: 24, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  rowBody: { flex: 1, gap: 3 },
  rowName: { fontSize: 14, fontWeight: '700', color: colors.heading },
  rowMeta: { fontSize: 12, color: colors.textMuted },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.placeholder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  empty: { marginTop: 32, textAlign: 'center', fontSize: 13, color: colors.textMuted },
  footer: {
    paddingTop: 12,
    paddingBottom: 16,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    backgroundColor: colors.floatingSurface,
  },
});
