import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import MessageDetailSheet from '@/components/organisms/MessageDetailSheet';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/store/slices/notificationSlice';
import { colors } from '@/theme/colors';
import type { AppNotification } from '@/types';
import { formatRelativeTime } from '@/utils/format';

type Props = RootStackScreenProps<typeof ROUTES.notifications>;

const typeIcon: Record<string, IconName> = {
  emergency: 'emergency',
  announcement: 'megaphone',
  info: 'info',
  system: 'settings',
};

const typeColor: Record<string, string> = {
  emergency: colors.danger,
  announcement: colors.warning,
  info: colors.primary,
  system: colors.textMuted,
};

const typeSurface: Record<string, string> = {
  emergency: colors.dangerSurface,
  announcement: colors.chipSurface,
  info: colors.primarySurface,
  system: colors.chipSurface,
};

function iconFor(type: string): IconName {
  return typeIcon[type] ?? 'info';
}

export default function NotificationsScreen(props: Props) {
  const { navigation } = props;
  const dispatch = useAppDispatch();
  const { items, meta, status, unreadTotal } = useAppSelector(state => state.notifications);
  const [selected, setSelected] = useState<AppNotification | null>(null);

  const load = useCallback(
    (page: number) => {
      dispatch(fetchNotifications({ page }));
    },
    [dispatch],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const isLoading = status === 'loading';
  const canLoadMore = meta ? meta.current_page < meta.last_page : false;

  function handlePress(item: AppNotification) {
    if (!item.read) dispatch(markNotificationRead(item.id));
    setSelected(item);
  }

  function actionFor(item: AppNotification): { label: string; onPress: () => void } | undefined {
    const action = item.action;
    if (action?.type === 'emergency') {
      return {
        label: 'Buka Detail Darurat',
        onPress: () => {
          setSelected(null);
          navigation.navigate(ROUTES.emergencyDetail, { id: String(action.id) });
        },
      };
    }
    if (action?.type === 'emergency_list') {
      return {
        label: 'Buka Daftar Darurat',
        onPress: () => {
          setSelected(null);
          navigation.navigate(ROUTES.emergencyList);
        },
      };
    }
    if (action?.type === 'disposition') {
      return {
        label: 'Buka Detail Disposisi',
        onPress: () => {
          setSelected(null);
          navigation.navigate(ROUTES.dispositionDetail, { id: Number(action.id) });
        },
      };
    }
    if (action?.type === 'disposition_list') {
      return {
        label: 'Buka Daftar Disposisi',
        onPress: () => {
          setSelected(null);
          navigation.navigate(ROUTES.dispositionList);
        },
      };
    }
    return undefined;
  }

  return (
    <MainLayout
      title="Notifikasi"
      subtitle="Pemberitahuan & pengumuman"
      variant="canvas"
      onBack={() => navigation.goBack()}
      right={
        unreadTotal > 0 ? (
          <PressableScale onPress={() => dispatch(markAllNotificationsRead())} hitSlop={8}>
            <Text style={styles.markAll}>Tandai semua</Text>
          </PressableScale>
        ) : null
      }>
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
            <Text style={styles.empty}>Belum ada notifikasi.</Text>
          )
        }
        ListFooterComponent={
          canLoadMore && items.length > 0 ? (
            <ActivityIndicator style={styles.footerLoader} color={colors.primary} />
          ) : undefined
        }
        renderItem={({ item }) => {
          const color = typeColor[item.type] ?? colors.primary;
          const surface = typeSurface[item.type] ?? colors.primarySurface;
          return (
            <PressableScale scaleTo={0.98} onPress={() => handlePress(item)}>
              <Card style={[styles.row, !item.read && styles.rowUnread]}>
                <View style={[styles.iconCircle, { backgroundColor: surface }]}>
                  <Icon name={iconFor(item.type)} size={18} color={color} />
                </View>
                <View style={styles.textGroup}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.body} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <Text style={styles.time}>{formatRelativeTime(item.created_at) ?? '-'}</Text>
                </View>
                {!item.read ? <View style={styles.unreadDot} /> : null}
              </Card>
            </PressableScale>
          );
        }}
      />

      <MessageDetailSheet
        visible={selected !== null}
        onRequestClose={() => setSelected(null)}
        icon={selected ? iconFor(selected.type) : 'info'}
        iconColor={(selected && typeColor[selected.type]) || colors.primary}
        iconSurface={(selected && typeSurface[selected.type]) || colors.primarySurface}
        title={selected?.title ?? ''}
        body={selected?.body ?? ''}
        metaLines={[selected ? formatRelativeTime(selected.created_at) ?? undefined : undefined]}
        action={selected ? actionFor(selected) : undefined}
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
  markAll: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
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
  rowUnread: {
    borderColor: colors.notifUnreadBorder,
    backgroundColor: colors.notifUnreadSurface,
  },
  iconCircle: {
    height: 40,
    width: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    flex: 1,
    gap: 3,
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
  time: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  unreadDot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
});
