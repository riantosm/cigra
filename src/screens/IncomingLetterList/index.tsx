import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { CommonActions, useFocusEffect } from '@react-navigation/native';

import Badge from '@/components/atoms/Badge';
import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import SearchFilterBar from '@/components/molecules/SearchFilterBar';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getIncomingLettersApi } from '@/services/api/disposition.service';
import { colors } from '@/theme/colors';
import { smallButtonShadow, tabBarShadow } from '@/theme/shadows';
import type { IncomingLetterListItem, SecurityLevel } from '@/types';
import { extractErrorMessage } from '@/utils/format';
import { SECURITY_LEVELS, letterDateLabel, securityLevelBadgeVariant, securityLevelLabel } from '@/utils/disposition';

type Props = RootStackScreenProps<typeof ROUTES.incomingLetterList>;

const PER_PAGE = 20;

export default function IncomingLetterListScreen(props: Props) {
  const { navigation, route } = props;
  const pickerMode = route.params?.pickerMode ?? false;

  function openLetter(item: IncomingLetterListItem) {
    if (pickerMode) {
      // Set param di layar Buat Disposisi (route sebelumnya) lalu kembali — merge, jadi penerima aman.
      const state = navigation.getState();
      const prevRoute = state.routes[state.index - 1];
      if (prevRoute) {
        navigation.dispatch({
          ...CommonActions.setParams({
            incomingLetter: { id: item.id, letter_number: item.letter_number, subject: item.subject },
          }),
          source: prevRoute.key,
        });
      }
      navigation.goBack();
      return;
    }
    navigation.navigate(ROUTES.incomingLetterDetail, { id: item.id });
  }

  const [items, setItems] = useState<IncomingLetterListItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [security, setSecurity] = useState<SecurityLevel | null>(null);
  const isFirstFocus = useRef(true);

  const load = useCallback(
    async (targetPage: number, mode: 'initial' | 'refresh' | 'more') => {
      if (mode === 'initial') setIsLoading(true);
      if (mode === 'refresh') setIsRefreshing(true);
      if (mode === 'more') setIsLoadingMore(true);
      setErrorMessage(null);
      try {
        const result = await getIncomingLettersApi({
          page: targetPage,
          per_page: PER_PAGE,
          search: query.trim() || undefined,
          security_level: security ?? undefined,
        });
        setItems(previous =>
          targetPage <= 1
            ? result.items
            : [...previous, ...result.items.filter(i => !previous.some(p => p.id === i.id))],
        );
        setPage(result.meta.current_page);
        setLastPage(result.meta.last_page);
      } catch (error) {
        setErrorMessage(extractErrorMessage(error, 'Gagal memuat daftar surat masuk.'));
        if (mode !== 'more') setItems([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [query, security],
  );

  // Muat awal + debounce tiap kali search / filter berubah.
  useEffect(() => {
    const timer = setTimeout(
      () => load(1, isFirstFocus.current ? 'initial' : 'refresh'),
      isFirstFocus.current ? 0 : 350,
    );
    isFirstFocus.current = false;
    return () => clearTimeout(timer);
  }, [query, security, load]);

  // Re-fetch saat kembali ke layar ini (mis. setelah catat surat baru / buat disposisi).
  useFocusEffect(
    useCallback(() => {
      if (!isFirstFocus.current) load(1, 'refresh');
    }, [load]),
  );

  const canLoadMore = page < lastPage;
  const securityChips = useMemo(
    () => [null, ...SECURITY_LEVELS] as (SecurityLevel | null)[],
    [],
  );

  return (
    <MainLayout
      title="Surat Masuk"
      subtitle={pickerMode ? 'Pilih surat untuk didisposisikan' : 'Arsip surat & status disposisinya'}
      variant="canvas"
      onBack={() => navigation.goBack()}
      right={
        pickerMode ? undefined : (
          <PressableScale
            onPress={() => navigation.navigate(ROUTES.dispositionList)}
            hitSlop={12}
            contentStyle={styles.headerAction}
            accessibilityRole="button"
            accessibilityLabel="Disposisi yang ditujukan kepada Anda">
            <Icon name="mail" size={20} color={colors.primary} />
          </PressableScale>
        )
      }>
      <View style={styles.flex}>
        <SearchFilterBar
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          placeholder="Cari nomor surat, perihal, pengirim..."
          style={styles.search}
        />
        <View style={styles.chipRow}>
          {securityChips.map(level => {
            const active = security === level;
            return (
              <PressableScale
                key={level ?? 'all'}
                scaleTo={0.96}
                onPress={() => setSecurity(level)}
                contentStyle={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {level ? securityLevelLabel[level] : 'Semua'}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => load(1, 'refresh')} tintColor={colors.primary} />
            }
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (canLoadMore && !isLoadingMore) load(page + 1, 'more');
            }}
            ListEmptyComponent={
              <Text style={styles.empty}>{errorMessage ?? 'Belum ada surat masuk.'}</Text>
            }
            ListFooterComponent={
              isLoadingMore ? <ActivityIndicator style={styles.footerLoader} color={colors.primary} /> : undefined
            }
            renderItem={({ item }) => (
              <PressableScale scaleTo={0.98} onPress={() => openLetter(item)}>
                <Card style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.code}>{item.letter_number}</Text>
                    <Badge
                      label={securityLevelLabel[item.security_level]}
                      variant={securityLevelBadgeVariant[item.security_level] ?? 'neutral'}
                    />
                  </View>
                  <Text style={styles.subject} numberOfLines={2}>
                    {item.subject}
                  </Text>
                  {item.summary ? (
                    <Text style={styles.summary} numberOfLines={2}>
                      {item.summary}
                    </Text>
                  ) : null}
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Icon name="building" size={12} color={colors.textMuted} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {item.source_sender}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Icon name="calendar" size={12} color={colors.textMuted} />
                      <Text style={styles.metaText}>Diterima {letterDateLabel(item.received_date)}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.cardFoot}>
                    {item.dispositions_count > 0 ? (
                      <Badge label={`${item.dispositions_count} disposisi`} variant="primary" />
                    ) : (
                      <Badge label="Belum didisposisikan" variant="neutral" />
                    )}
                    <View style={styles.detailLink}>
                      <Text style={styles.detailLinkText}>
                        {pickerMode
                          ? 'Pilih'
                          : item.dispositions_count > 0
                            ? 'Detail'
                            : 'Buat Disposisi'}
                      </Text>
                      <Icon name="chevron-right" size={16} color={colors.primary} />
                    </View>
                  </View>
                </Card>
              </PressableScale>
            )}
          />
        )}
      </View>

      {pickerMode ? null : (
        <View style={styles.footer}>
          <GradientButton
            label="Catat Surat Masuk Baru"
            icon="edit"
            onPress={() => navigation.navigate(ROUTES.incomingLetterCreate)}
          />
        </View>
      )}
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
  flex: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  search: { marginBottom: 12 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.chipSurface, borderColor: colors.primarySurface },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.primary },
  loader: { marginTop: 40 },
  footerLoader: { marginVertical: 16 },
  listContent: { paddingTop: 4, paddingBottom: 110, gap: 14 },
  empty: { marginTop: 32, textAlign: 'center', fontSize: 14, color: colors.textMuted },
  card: { gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  code: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.textMuted,
    backgroundColor: colors.neutralSurface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    overflow: 'hidden',
  },
  subject: { fontSize: 15, fontWeight: '700', color: colors.heading, lineHeight: 20 },
  summary: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, columnGap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '58%' },
  metaText: { fontSize: 12, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.borderSoft },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  detailLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailLinkText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: colors.floatingSurface,
    ...tabBarShadow,
  },
});
