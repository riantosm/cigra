import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

import GradientAvatar from '@/components/atoms/GradientAvatar';
import GradientButton from '@/components/atoms/GradientButton';
import PressableScale from '@/components/atoms/PressableScale';
import SearchFilterBar from '@/components/molecules/SearchFilterBar';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { appointCoopJuyarApi, searchCoopJuyarCandidatesApi } from '@/services/api/coopSalary.service';
import { colors } from '@/theme/colors';
import { smallButtonShadow, tabBarShadow } from '@/theme/shadows';
import type { CoopJuyarCandidate } from '@/types';
import { cleanValue, extractErrorMessage, joinFields } from '@/utils/format';
import { initialsOf } from '@/utils/rollCall';

type Props = RootStackScreenProps<typeof ROUTES.coopJuyarAppoint>;

const MIN_QUERY = 2;
const DEBOUNCE_MS = 400;

type Modal = { variant: 'success' | 'error'; title: string; message: string } | null;

// Tunjuk Juyar: cari prajurit (`GET /coop-salary-report/juyars/candidates?q=`, min 2 huruf) → pilih
// satu → catatan opsional → `POST /coop-salary-report/juyars {personnel_id, notes?}`. Role
// `petugas_laporan_koperasi` diberikan backend otomatis. Prajurit tanpa akun login ditolak backend —
// pesannya ditampilkan apa adanya di popup gagal.
export default function CoopJuyarAppointScreen(props: Props) {
  const { navigation } = props;
  const keyboardHeight = useKeyboardHeight();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CoopJuyarCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CoopJuyarCandidate | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState<Modal>(null);

  const trimmed = query.trim();
  const tooShort = trimmed.length < MIN_QUERY;

  useEffect(() => {
    if (tooShort) {
      setResults([]);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const found = await searchCoopJuyarCandidatesApi(trimmed);
        if (!cancelled) setResults(found);
      } catch (error) {
        if (!cancelled) setSearchError(extractErrorMessage(error, 'Pencarian gagal.'));
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, tooShort]);

  async function submit() {
    if (!selected) return;
    setIsSubmitting(true);
    try {
      const message = await appointCoopJuyarApi({ personnel_id: selected.id, notes });
      setModal({ variant: 'success', title: 'Juyar Ditunjuk', message });
    } catch (error) {
      setModal({
        variant: 'error',
        title: 'Belum Bisa Ditunjuk',
        message: extractErrorMessage(error, 'Penunjukan Juyar gagal disimpan.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeModal() {
    const success = modal?.variant === 'success';
    setModal(null);
    if (success) navigation.goBack();
  }

  const footHint = selected
    ? `${selected.name} bisa membuka rekap tagihan satuan setelah ditunjuk.`
    : 'Pilih satu prajurit dari hasil pencarian.';

  const header = (
    <View>
      <Text style={styles.fieldLabel}>Cari prajurit</Text>
      <SearchFilterBar
        value={query}
        onChangeText={text => {
          setQuery(text);
          setSelected(null);
        }}
        onClear={() => {
          setQuery('');
          setSelected(null);
        }}
        placeholder="Nama atau NRP"
        autoFocus
      />
      {tooShort ? <Text style={styles.searchHint}>Ketik minimal 2 huruf nama atau NRP.</Text> : null}
      {searchError ? <Text style={styles.searchError}>{searchError}</Text> : null}
      {!tooShort && !isSearching && results.length > 0 ? (
        <Text style={styles.resultCount}>{results.length} hasil</Text>
      ) : null}
      {isSearching ? <ActivityIndicator style={styles.searchLoader} color={colors.primary} /> : null}
    </View>
  );

  const notesField = (
    <View style={styles.notesWrap}>
      <Text style={styles.fieldLabel}>
        Catatan penunjukan <Text style={styles.optional}>(opsional)</Text>
      </Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Mis. juru bayar Kipan A"
        placeholderTextColor={colors.placeholder}
        multiline
        style={styles.notesInput}
      />
    </View>
  );

  return (
    <MainLayout title="Tunjuk Juyar" subtitle="Pengelola Tagihan Satuan" variant="canvas" onBack={() => navigation.goBack()}>
      <View style={[styles.flex, { paddingBottom: keyboardHeight }]}>
        <FlatList
          data={tooShort || isSearching ? [] : results}
          keyExtractor={item => String(item.id)}
          ListHeaderComponent={header}
          ListFooterComponent={notesField}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            !tooShort && !isSearching && !searchError ? (
              <Text style={styles.empty}>Tidak ada prajurit yang cocok.</Text>
            ) : undefined
          }
          renderItem={({ item }) => {
            const active = selected?.id === item.id;
            return (
              <PressableScale
                scaleTo={0.98}
                onPress={() => setSelected(item)}
                accessibilityState={{ selected: active }}
                contentStyle={[styles.result, active && styles.resultActive]}>
                <GradientAvatar
                  label={initialsOf(item.name)}
                  gradientStart={colors.gradientPrimaryStart}
                  gradientEnd={colors.gradientPrimaryEnd}
                  size={40}
                />
                <View style={styles.resultBody}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.resultMeta} numberOfLines={1}>
                    {joinFields(item.rank, item.company) || '-'}
                  </Text>
                  {cleanValue(item.nrp) ? (
                    <Text style={styles.resultNrp} numberOfLines={1}>
                      NRP {item.nrp}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <View style={styles.radioDot} /> : null}
                </View>
              </PressableScale>
            );
          }}
        />

        <View style={styles.footer}>
          <Text style={styles.footerHint}>{footHint}</Text>
          <GradientButton
            label={selected ? `Tunjuk ${selected.name}` : 'Tunjuk Juyar'}
            icon="check"
            loading={isSubmitting}
            disabled={!selected || isSubmitting}
            onPress={submit}
          />
        </View>
      </View>

      <StatusModal
        visible={modal !== null}
        variant={modal?.variant ?? 'success'}
        title={modal?.title ?? ''}
        message={modal?.message ?? ''}
        onRequestClose={closeModal}
        primaryAction={{ label: modal?.variant === 'success' ? 'Selesai' : 'Mengerti', onPress: closeModal }}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 8 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: colors.textMuted, marginBottom: 6 },
  optional: { color: colors.placeholder },
  searchHint: { fontSize: 12, color: colors.placeholder, marginTop: 10, marginLeft: 2 },
  searchError: { fontSize: 13, color: colors.danger, marginTop: 10 },
  searchLoader: { marginTop: 24 },
  resultCount: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 16, marginBottom: 4, marginLeft: 2 },
  empty: { marginTop: 24, textAlign: 'center', fontSize: 14, color: colors.textMuted },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  resultActive: { backgroundColor: colors.notifUnreadSurface, borderColor: colors.notifUnreadBorder },
  resultBody: { flex: 1, minWidth: 0, gap: 2 },
  resultName: { fontSize: 15, fontWeight: '700', color: colors.heading },
  resultMeta: { fontSize: 12, color: colors.textMuted },
  resultNrp: { fontSize: 11, color: colors.placeholder },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.dividerOnGradient,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderWidth: 2, borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: colors.primary },
  notesWrap: { marginTop: 16 },
  notesInput: {
    minHeight: 88,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    fontSize: 14,
    lineHeight: 20,
    color: colors.heading,
    textAlignVertical: 'top',
    ...smallButtonShadow,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10,
    backgroundColor: colors.floatingSurface,
    ...tabBarShadow,
  },
  footerHint: { textAlign: 'center', fontSize: 12, lineHeight: 17, color: colors.textMuted },
});
