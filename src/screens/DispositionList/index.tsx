import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Badge from '@/components/atoms/Badge';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import FilterSheet from '@/components/organisms/FilterSheet';
import type { FilterField } from '@/components/organisms/FilterSheet';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getDispositionSummaryApi, getDispositionsApi } from '@/services/api/disposition.service';
import { colors } from '@/theme/colors';
import type { DispositionListItem, DispositionStatus, DispositionSummary } from '@/types';
import { extractErrorMessage, formatRelativeTime } from '@/utils/format';
import {
  dispositionStatusBadgeVariant,
  dispositionStatusLabel,
  priorityBadgeVariant,
  priorityLabel,
} from '@/utils/disposition';

type Props = RootStackScreenProps<typeof ROUTES.dispositionList>;

const PER_PAGE = 20;

const STATUS_FILTER: FilterField = {
  key: 'status',
  label: 'Status',
  options: [
    { label: 'Menunggu', value: 'pending' },
    { label: 'Dalam Proses', value: 'in_progress' },
    { label: 'Selesai', value: 'completed' },
    { label: 'Diarsipkan', value: 'archived' },
  ],
};

export default function DispositionListScreen(props: Props) {
  const { navigation } = props;

  const [summary, setSummary] = useState<DispositionSummary | null>(null);
  const [items, setItems] = useState<DispositionListItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const isFirstFocus = useRef(true);

  const statusFilter = (filters.status as DispositionStatus | undefined) ?? undefined;

  const load = useCallback(
    async (targetPage: number, mode: 'initial' | 'refresh' | 'more') => {
      if (mode === 'initial') setIsLoading(true);
      if (mode === 'refresh') setIsRefreshing(true);
      if (mode === 'more') setIsLoadingMore(true);
      setErrorMessage(null);
      try {
        const [summaryResult, listResult] = await Promise.allSettled([
          mode === 'more' ? Promise.resolve(null) : getDispositionSummaryApi(),
          getDispositionsApi({ status: statusFilter, page: targetPage, per_page: PER_PAGE }),
        ]);
        if (summaryResult.status === 'fulfilled' && summaryResult.value) {
          setSummary(summaryResult.value);
        }
        if (listResult.status === 'fulfilled') {
          const result = listResult.value;
          setItems(previous =>
            targetPage <= 1
              ? result.items
              : [...previous, ...result.items.filter(i => !previous.some(p => p.id === i.id))],
          );
          setPage(result.meta.current_page);
          setLastPage(result.meta.last_page);
        } else {
          setErrorMessage(extractErrorMessage(listResult.reason, 'Gagal memuat daftar disposisi.'));
          if (mode !== 'more') setItems([]);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [statusFilter],
  );

  useFocusEffect(
    useCallback(() => {
      load(1, isFirstFocus.current ? 'initial' : 'refresh');
      isFirstFocus.current = false;
    }, [load]),
  );

  const canLoadMore = page < lastPage;

  const summaryTiles = useMemo(
    () => [
      { label: 'Belum Dibaca', value: summary?.unread_count ?? 0, icon: 'mail' as const, color: colors.primary },
      { label: 'Total Masuk', value: summary?.total_assigned ?? 0, icon: 'file' as const, color: colors.textMuted },
      { label: 'Selesai', value: summary?.completed_count ?? 0, icon: 'check' as const, color: colors.success },
    ],
    [summary],
  );

  return (
    <MainLayout
      title="Disposisi Surat"
      subtitle="Disposisi yang ditujukan kepada Anda"
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
                <View style={styles.summaryRow}>
                  {summaryTiles.map(tile => (
                    <Card key={tile.label} style={styles.summaryTile}>
                      <View style={styles.summaryTileHead}>
                        <Icon name={tile.icon} size={13} color={tile.color} />
                        <Text style={styles.summaryTileLabel}>{tile.label}</Text>
                      </View>
                      <Text style={styles.summaryTileValue}>{tile.value}</Text>
                    </Card>
                  ))}
                </View>

                <PressableScale
                  scaleTo={0.98}
                  onPress={() => setIsFilterVisible(true)}
                  contentStyle={styles.filterBar}>
                  <Icon name="filter" size={16} color={colors.primary} />
                  <Text style={styles.filterBarText}>
                    {statusFilter ? dispositionStatusLabel[statusFilter] : 'Semua status'}
                  </Text>
                  <Icon name="chevron-down" size={16} color={colors.textMuted} />
                </PressableScale>
              </View>
            }
            ListEmptyComponent={
              <Text style={styles.empty}>{errorMessage ?? 'Belum ada disposisi masuk.'}</Text>
            }
            ListFooterComponent={
              isLoadingMore ? <ActivityIndicator style={styles.footerLoader} color={colors.primary} /> : undefined
            }
            renderItem={({ item }) => (
              <DispositionCard
                item={item}
                onOpen={() => navigation.navigate(ROUTES.dispositionDetail, { id: item.id })}
              />
            )}
          />
        )}
      </View>

      <FilterSheet
        visible={isFilterVisible}
        fields={[STATUS_FILTER]}
        value={filters}
        onApply={setFilters}
        onRequestClose={() => setIsFilterVisible(false)}
      />
    </MainLayout>
  );
}

function DispositionCard(props: { item: DispositionListItem; onOpen: () => void }) {
  const { item, onOpen } = props;
  const isUnread = item.recipient_status === 'unread';

  return (
    <PressableScale scaleTo={0.98} onPress={onOpen}>
      <Card style={[styles.card, isUnread && styles.cardUnread]}>
        <View style={styles.cardTop}>
          <Text style={styles.code}>{item.disposition_number}</Text>
          <View style={styles.badges}>
            {item.priority ? (
              <Badge label={priorityLabel[item.priority]} variant={priorityBadgeVariant[item.priority]} />
            ) : null}
            <Badge
              label={item.status_label || dispositionStatusLabel[item.status]}
              variant={dispositionStatusBadgeVariant[item.status] ?? 'neutral'}
            />
          </View>
        </View>

        <Text style={styles.subject} numberOfLines={2}>
          {item.letter_subject}
        </Text>
        {item.instruction ? (
          <View style={styles.instrRow}>
            <Icon name="file" size={14} color={colors.placeholder} />
            <Text style={styles.instr} numberOfLines={2}>
              &ldquo;{item.instruction}&rdquo;
            </Text>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Icon name="profile" size={12} color={colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.sender_name}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="clock" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{formatRelativeTime(item.created_at) ?? '-'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFoot}>
          {item.recipient_status_label ? (
            <Badge
              label={item.recipient_status_label}
              variant={item.recipient_status === 'unread' ? 'neutral' : 'primary'}
            />
          ) : (
            <Text style={styles.footMeta} />
          )}
          <View style={styles.detailLink}>
            <Text style={styles.detailLinkText}>Lihat detail</Text>
            <Icon name="chevron-right" size={16} color={colors.primary} />
          </View>
        </View>
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 48 },
  footerLoader: { marginVertical: 16 },
  listContent: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 40, gap: 14 },
  listHeader: { gap: 14 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryTile: { flex: 1, padding: 12 },
  summaryTileHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryTileLabel: { fontSize: 11, fontWeight: '600', color: colors.textBody },
  summaryTileValue: { fontSize: 20, fontWeight: '800', color: colors.heading, marginTop: 4 },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  filterBarText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  empty: { marginTop: 32, textAlign: 'center', fontSize: 14, color: colors.textMuted },
  card: { gap: 10 },
  cardUnread: { borderColor: colors.notifUnreadBorder, backgroundColor: colors.notifUnreadSurface },
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
  badges: { flexDirection: 'row', gap: 6, flexShrink: 1, justifyContent: 'flex-end', flexWrap: 'wrap' },
  subject: { fontSize: 15, fontWeight: '700', color: colors.heading, lineHeight: 20 },
  instrRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  instr: { flex: 1, fontSize: 13, color: colors.textBody, lineHeight: 18 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, columnGap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '60%' },
  metaText: { fontSize: 12, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.borderSoft },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  footMeta: { flex: 1 },
  detailLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailLinkText: { fontSize: 13, fontWeight: '600', color: colors.primary },
});
