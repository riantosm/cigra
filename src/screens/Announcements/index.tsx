import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import GradientIconChip from '@/components/atoms/GradientIconChip';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import MessageDetailSheet from '@/components/organisms/MessageDetailSheet';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchAnnouncements } from '@/store/slices/announcementSlice';
import { colors } from '@/theme/colors';
import type { Announcement } from '@/types';
import type { IconName } from '@/components/atoms/Icon';
import { formatDateTime, formatRelativeTime, joinFields } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.announcements>;

const typeMeta: Record<
  string,
  { label: string; icon: IconName; color: string; surface: string; gradient: readonly [string, string] }
> = {
  alert: {
    label: 'Peringatan',
    icon: 'alert-triangle',
    color: colors.danger,
    surface: colors.dangerSurface,
    gradient: [colors.gradientDangerStart, colors.danger],
  },
  announcement: {
    label: 'Pengumuman',
    icon: 'megaphone',
    color: colors.warning,
    surface: colors.chipSurface,
    gradient: [colors.gradientWarnStart, colors.warning],
  },
  info: {
    label: 'Info',
    icon: 'info',
    color: colors.primary,
    surface: colors.primarySurface,
    gradient: [colors.gradientPrimaryStart, colors.gradientPrimaryEnd],
  },
};

function metaFor(type: string) {
  return typeMeta[type] ?? typeMeta.announcement;
}

export default function AnnouncementsScreen(props: Props) {
  const { navigation } = props;
  const dispatch = useAppDispatch();
  const { items, meta, status } = useAppSelector(state => state.announcements);
  const [selected, setSelected] = useState<Announcement | null>(null);

  const load = useCallback(
    (page: number) => {
      dispatch(fetchAnnouncements({ page, per_page: 20 }));
    },
    [dispatch],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const isLoading = status === 'loading';
  const canLoadMore = meta ? meta.current_page < meta.last_page : false;

  return (
    <MainLayout
      title="Pengumuman"
      subtitle="Semua pengumuman & peringatan satuan"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      <FlatList
        data={items}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading && items.length > 0} onRefresh={() => load(1)} tintColor={colors.primary} />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (canLoadMore && !isLoading && meta) load(meta.current_page + 1);
        }}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : (
            <Text style={styles.empty}>Belum ada pengumuman.</Text>
          )
        }
        ListFooterComponent={
          canLoadMore && items.length > 0 ? (
            <ActivityIndicator style={styles.footerLoader} color={colors.primary} />
          ) : undefined
        }
        renderItem={({ item }) => {
          const m = metaFor(item.type);
          return (
            <PressableScale scaleTo={0.98} onPress={() => setSelected(item)}>
              <Card style={styles.row}>
                <GradientIconChip icon={m.icon} colors={m.gradient} size={40} iconSize={18} radius={12} />
                <View style={styles.textGroup}>
                  <View style={styles.topRow}>
                    <View style={[styles.typePill, { backgroundColor: m.surface }]}>
                      <Text style={[styles.typePillLabel, { color: m.color }]}>{m.label}</Text>
                    </View>
                    <Text style={styles.time}>{formatRelativeTime(item.published_at) ?? '-'}</Text>
                  </View>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.body} numberOfLines={1}>
                    {item.body}
                  </Text>
                  <Text style={styles.sender} numberOfLines={1}>
                    {item.created_by?.name ?? 'Komando'}
                  </Text>
                </View>
              </Card>
            </PressableScale>
          );
        }}
      />

      <MessageDetailSheet
        visible={selected !== null}
        onRequestClose={() => setSelected(null)}
        icon={selected ? metaFor(selected.type).icon : 'megaphone'}
        iconColor={selected ? metaFor(selected.type).color : colors.primary}
        iconSurface={selected ? metaFor(selected.type).surface : colors.primarySurface}
        gradientColors={selected ? metaFor(selected.type).gradient : typeMeta.info.gradient}
        title={selected?.title ?? ''}
        body={selected?.body ?? ''}
        metaLines={[
          selected?.created_by?.name ?? undefined,
          selected
            ? joinFields(formatRelativeTime(selected.published_at) ?? undefined, formatDateTime(selected.published_at) ?? undefined)
            : undefined,
          selected?.scope_label ?? undefined,
        ]}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 96,
    gap: 12,
  },
  loader: {
    marginTop: 40,
  },
  footerLoader: {
    marginVertical: 16,
  },
  empty: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 14,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  textGroup: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  typePillLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.heading,
  },
  body: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  sender: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  time: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
