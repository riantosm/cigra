import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import Badge from '@/components/atoms/Badge';
import GradientAvatar from '@/components/atoms/GradientAvatar';
import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import SearchFilterBar from '@/components/molecules/SearchFilterBar';
import StatusModal from '@/components/organisms/StatusModal';
import MainLayout from '@/components/templates/MainLayout';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  appointRollCallOfficerApi,
  appointRollCallRepresentativeApi,
  searchRollCallPersonnelApi,
} from '@/services/api/rollCall.service';
import { colors } from '@/theme/colors';
import type { RollCallPersonnelSearchItem } from '@/types';
import { extractErrorMessage, joinFields } from '@/utils/format';
import { initialsOf } from '@/utils/rollCall';
import { sharedStyles } from '@/screens/RollCall/shared';

type Props = RootStackScreenProps<typeof ROUTES.rollCallAppoint>;

const MIN_QUERY = 2;
const DEBOUNCE_MS = 400;

type Modal =
  | { kind: 'confirm-replace' }
  | { kind: 'result'; variant: 'success' | 'error'; title: string; message: string }
  | null;

// Menunjuk petugas piket (POST /roll-calls/officers — komandan saja) atau perwakilan satu kompi
// (POST /roll-calls/representatives). Kompi yang sudah punya perwakilan: yang lama otomatis
// digantikan, jadi ada konfirmasi dulu. Pencarian = GET /roll-calls/personnel-search (min 2 huruf).
export default function RollCallAppointScreen(props: Props) {
  const { navigation, route } = props;
  const params = route.params;
  const isRepresentative = params.kind === 'representative';
  const current = params.kind === 'representative' ? params.current ?? null : null;
  const companyName = params.kind === 'representative' ? params.companyName : '';
  const keyboardHeight = useKeyboardHeight();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RollCallPersonnelSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RollCallPersonnelSearchItem | null>(null);
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
        const found = await searchRollCallPersonnelApi(trimmed);
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
    setModal(null);
    setIsSubmitting(true);
    try {
      const message =
        params.kind === 'representative'
          ? await appointRollCallRepresentativeApi(params.unitId, selected.id)
          : await appointRollCallOfficerApi(selected.id);
      setModal({
        kind: 'result',
        variant: 'success',
        title: current ? 'Perwakilan Diganti' : 'Berhasil Ditunjuk',
        message,
      });
    } catch (error) {
      setModal({
        kind: 'result',
        variant: 'error',
        title: 'Gagal Menunjuk',
        message: extractErrorMessage(error, 'Penunjukan gagal disimpan.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePrimary() {
    if (current) setModal({ kind: 'confirm-replace' });
    else submit();
  }

  function closeResult() {
    const success = modal?.kind === 'result' && modal.variant === 'success';
    setModal(null);
    if (success) navigation.goBack();
  }

  const title = isRepresentative ? (current ? 'Ganti Perwakilan' : 'Tunjuk Perwakilan') : 'Tunjuk Petugas Piket';
  const subtitle = isRepresentative ? companyName : 'Membuka dan menutup agenda apel';
  const footHint = selected
    ? isRepresentative
      ? current
        ? `${selected.name} akan menggantikan ${current.name} sebagai perwakilan ${companyName}.`
        : `${selected.name} akan mendapat akses mengisi kehadiran ${companyName}.`
      : `${selected.name} akan bisa membuka dan menutup agenda apel.`
    : 'Pilih satu prajurit dari hasil pencarian.';
  const buttonLabel = selected
    ? current
      ? `Ganti dengan ${selected.name}`
      : `Tunjuk ${selected.name}`
    : title;

  const header = (
    <View>
      {current ? (
        <View style={[sharedStyles.card, styles.currentCard]}>
          <Text style={styles.currentLabel}>Perwakilan saat ini</Text>
          <View style={styles.currentRow}>
            <GradientAvatar
              label={initialsOf(current.name)}
              gradientStart={current.isActive ? colors.gradientPrimaryStart : colors.gradientInactiveStart}
              gradientEnd={current.isActive ? colors.gradientPrimaryEnd : colors.gradientInactiveEnd}
              size={40}
            />
            <View style={styles.resultBody}>
              <View style={styles.nameRow}>
                <Text style={styles.resultName} numberOfLines={1}>
                  {current.name}
                </Text>
                {!current.isActive ? <Badge label="NONAKTIF" variant="neutral" /> : null}
              </View>
              {current.username ? <Text style={sharedStyles.rowMetaFaint}>{current.username}</Text> : null}
            </View>
          </View>
          <View style={styles.replaceNote}>
            <Icon name="swap" size={14} color={colors.warningText} />
            <Text style={styles.replaceText}>Otomatis digantikan oleh prajurit yang dipilih di bawah.</Text>
          </View>
        </View>
      ) : null}
      <Text style={sharedStyles.fieldLabel}>{current ? 'Cari prajurit pengganti' : 'Cari prajurit'}</Text>
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
        autoFocus={!current}
      />
      {tooShort ? <Text style={styles.searchHint}>Ketik minimal 2 huruf nama atau NRP.</Text> : null}
      {searchError ? <Text style={styles.searchError}>{searchError}</Text> : null}
      {!tooShort && !isSearching && results.length > 0 ? (
        <Text style={styles.resultCount}>{results.length} hasil</Text>
      ) : null}
      {isSearching ? <ActivityIndicator style={styles.searchLoader} color={colors.primary} /> : null}
    </View>
  );

  return (
    <MainLayout title={title} subtitle={subtitle} variant="canvas" onBack={() => navigation.goBack()}>
      <View style={[sharedStyles.flex, { paddingBottom: keyboardHeight }]}>
        <FlatList
          data={tooShort || isSearching ? [] : results}
          keyExtractor={item => String(item.id)}
          ListHeaderComponent={header}
          contentContainerStyle={[sharedStyles.scrollContent, styles.listContent]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            !tooShort && !isSearching && !searchError ? (
              <Text style={sharedStyles.empty}>Tidak ada prajurit yang cocok.</Text>
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
                  <Text style={sharedStyles.rowMeta} numberOfLines={1}>
                    {joinFields(item.rank, item.company) || '-'}
                  </Text>
                  {item.username ? (
                    <Text style={styles.username} numberOfLines={1}>
                      {item.username}
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

        <View style={sharedStyles.footer}>
          <Text style={sharedStyles.footerHint}>{footHint}</Text>
          <GradientButton
            label={buttonLabel}
            icon={current ? 'swap' : 'user-plus'}
            loading={isSubmitting}
            disabled={!selected || isSubmitting}
            onPress={handlePrimary}
          />
        </View>
      </View>

      <StatusModal
        visible={modal?.kind === 'confirm-replace'}
        variant="error"
        title={`Ganti perwakilan ${companyName}?`}
        message={
          selected && current
            ? `${current.name} dicabut dari perwakilan ${companyName} dan digantikan ${selected.name}. ${selected.name} langsung bisa mengisi kehadiran ${companyName}.`
            : ''
        }
        onRequestClose={() => setModal(null)}
        secondaryAction={{ label: 'Batal', onPress: () => setModal(null) }}
        primaryAction={{ label: 'Ganti', onPress: submit }}
      />
      <StatusModal
        visible={modal?.kind === 'result'}
        variant={modal?.kind === 'result' ? modal.variant : 'success'}
        title={modal?.kind === 'result' ? modal.title : ''}
        message={modal?.kind === 'result' ? modal.message : ''}
        onRequestClose={closeResult}
        primaryAction={{
          label: modal?.kind === 'result' && modal.variant === 'success' ? 'Selesai' : 'Tutup',
          onPress: closeResult,
        }}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  listContent: { gap: 8 },
  currentCard: { gap: 10, marginBottom: 20 },
  currentLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  currentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  replaceNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  replaceText: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.warningText },
  searchHint: { fontSize: 12, color: colors.placeholder, marginTop: 10, marginLeft: 2 },
  searchError: { fontSize: 13, color: colors.danger, marginTop: 10 },
  searchLoader: { marginTop: 24 },
  resultCount: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 16, marginBottom: 4, marginLeft: 2 },
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
  username: { fontSize: 11, color: colors.placeholder },
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
});
