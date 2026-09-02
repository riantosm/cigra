import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Badge from '@/components/atoms/Badge';
import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getRollCallsApi } from '@/services/api/rollCall.service';
import { colors } from '@/theme/colors';
import { tabBarShadow } from '@/theme/shadows';
import type { RollCallSession } from '@/types';
import { extractErrorMessage } from '@/utils/format';
import { rollCallDateLabel, rollCallStatusLabel, rollCallTimeLabel } from '@/utils/rollCall';

type Props = RootStackScreenProps<typeof ROUTES.rollCallList>;

const PER_PAGE = 20;

export default function RollCallListScreen(props: Props) {
  const { navigation } = props;

  const [items, setItems] = useState<RollCallSession[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isFirstFocus = useRef(true);

  const load = useCallback(async (targetPage: number, mode: 'initial' | 'refresh' | 'more') => {
    if (mode === 'initial') setIsLoading(true);
    if (mode === 'refresh') setIsRefreshing(true);
    if (mode === 'more') setIsLoadingMore(true);
    setErrorMessage(null);
    try {
      const result = await getRollCallsApi({ page: targetPage, per_page: PER_PAGE });
      setItems(previous =>
        targetPage <= 1
          ? result.items
          : [...previous, ...result.items.filter(i => !previous.some(p => p.id === i.id))],
      );
      setPage(result.meta.current_page);
      setLastPage(result.meta.last_page);
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Gagal memuat daftar sesi apel.'));
      if (mode !== 'more') setItems([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(1, isFirstFocus.current ? 'initial' : 'refresh');
      isFirstFocus.current = false;
    }, [load]),
  );

  const canLoadMore = page < lastPage;
  const openCount = items.filter(i => i.status === 'open').length;

  return (
    <MainLayout
      title="Kekuatan Apel"
      subtitle="Sesi apel & rekap kehadiran satuan"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <View style={styles.flex}>
        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => load(1, 'refresh')}
                tintColor={colors.primary}
              />
            }
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (canLoadMore && !isLoadingMore) load(page + 1, 'more');
            }}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <Card style={styles.statusStrip}>
                  <View style={styles.statusStripLeft}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: openCount > 0 ? colors.success : colors.placeholder },
                      ]}
                    />
                    <Text style={styles.statusStripText}>
                      {openCount} sesi apel sedang berlangsung
                    </Text>
                  </View>
                  <Text style={styles.statusStripHint}>Hari ini</Text>
                </Card>
                <Text style={styles.sectionLabel}>SESI APEL</Text>
              </View>
            }
            ListEmptyComponent={
              <Text style={styles.empty}>{errorMessage ?? 'Belum ada sesi apel.'}</Text>
            }
            ListFooterComponent={
              isLoadingMore ? (
                <ActivityIndicator style={styles.footerLoader} color={colors.primary} />
              ) : undefined
            }
            renderItem={({ item }) => {
              const isOpen = item.status === 'open';
              const recap = item.recap;
              return (
                <PressableScale
                  scaleTo={0.98}
                  onPress={() => navigation.navigate(ROUTES.rollCallDetail, { id: item.id })}>
                  <Card style={styles.row}>
                    <View style={styles.rowTop}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.name ?? 'Sesi Apel'}
                      </Text>
                      <Badge
                        label={rollCallStatusLabel[item.status]}
                        variant={isOpen ? 'primary' : 'neutral'}
                      />
                    </View>
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Icon name="calendar" size={13} color={colors.textMuted} />
                        <Text style={styles.metaText}>{rollCallDateLabel(item.date)}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Icon name="clock" size={13} color={colors.textMuted} />
                        <Text style={styles.metaText}>{rollCallTimeLabel(item.time)} WIB</Text>
                      </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.recapRow}>
                      {recap ? (
                        <View style={styles.recapStats}>
                          <RecapStat color={colors.success} value={recap.present} label="hadir" />
                          <RecapStat color={colors.danger} value={recap.absent} label="tidak hadir" />
                          <RecapStat
                            color={colors.placeholder}
                            value={recap.unmarked}
                            label="belum"
                          />
                        </View>
                      ) : (
                        <Text style={styles.recapEmpty}>Lihat detail &amp; rekap</Text>
                      )}
                      <Icon name="chevron-right" size={16} color={colors.placeholder} />
                    </View>
                  </Card>
                </PressableScale>
              );
            }}
          />
        )}
      </View>

      <View style={styles.footer}>
        <GradientButton
          label="Buat Sesi Apel"
          onPress={() => navigation.navigate(ROUTES.rollCallCreate)}
        />
      </View>
    </MainLayout>
  );
}

function RecapStat(props: { color: string; value: number; label: string }) {
  return (
    <View style={styles.recapStat}>
      <View style={[styles.recapDot, { backgroundColor: props.color }]} />
      <Text style={styles.recapStatText}>
        {props.value} {props.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 48 },
  footerLoader: { marginVertical: 16 },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 110,
    gap: 14,
  },
  listHeader: { gap: 16 },
  statusStrip: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusStripLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 999 },
  statusStripText: { fontSize: 12, color: colors.textMuted },
  statusStripHint: { fontSize: 12, fontWeight: '600', color: colors.primary },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.4,
  },
  empty: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 14,
    color: colors.textMuted,
  },
  row: { gap: 10 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.heading,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.borderSoft },
  recapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  recapStats: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  recapStat: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 12 },
  recapDot: { width: 6, height: 6, borderRadius: 999 },
  recapStatText: { fontSize: 12, color: colors.textMuted },
  recapEmpty: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.primary },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: colors.floatingSurface,
    ...tabBarShadow,
  },
});
