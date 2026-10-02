import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import GradientIconChip from '@/components/atoms/GradientIconChip';
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
import { notificationCategory, resolveNotificationLink } from '@/utils/notificationAction';
import type { NotificationCategory } from '@/utils/notificationAction';

type Props = RootStackScreenProps<typeof ROUTES.notifications>;

// Ikon/warna per kelompok — `type` mentah dari backend dikelompokkan dulu oleh
// `notificationCategory` (mis. `panic_button` → emergency, `disposition_follow_up` → disposition).
const categoryIcon: Record<NotificationCategory, IconName> = {
  emergency: 'emergency',
  announcement: 'megaphone',
  disposition: 'mail',
  roll_call: 'clipboard-check',
  info: 'info',
  system: 'settings',
};

const categoryColor: Record<NotificationCategory, string> = {
  emergency: colors.danger,
  announcement: colors.warning,
  disposition: colors.primary,
  roll_call: colors.primary,
  info: colors.primary,
  system: colors.textMuted,
};

const categorySurface: Record<NotificationCategory, string> = {
  emergency: colors.dangerSurface,
  announcement: colors.chipSurface,
  disposition: colors.primarySurface,
  roll_call: colors.primarySurface,
  info: colors.primarySurface,
  system: colors.chipSurface,
};

// "Aksen Gradient" (DESIGN_SYSTEM.md) — samakan dengan chip ikon Home/Pengumuman (disposisi & apel =
// gradient quick action-nya). `system` sengaja tidak punya gradient (notifikasi generik, tanpa
// identitas warna kuat) — tetap chip tint flat.
const categoryGradient: Partial<Record<NotificationCategory, readonly [string, string]>> = {
  emergency: [colors.gradientDangerStart, colors.danger],
  announcement: [colors.gradientWarnStart, colors.warning],
  disposition: [colors.gradientPersonnelStart, colors.gradientPersonnelEnd],
  roll_call: [colors.gradientPersonnelStart, colors.gradientPersonnelEnd],
  info: [colors.gradientPrimaryStart, colors.gradientPrimaryEnd],
};

export default function NotificationsScreen(props: Props) {
  const { navigation } = props;
  const dispatch = useAppDispatch();
  const { items, meta, status, unreadTotal } = useAppSelector(state => state.notifications);
  const roles = useAppSelector(state => state.auth.user?.roles);
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
  const selectedCategory: NotificationCategory = selected ? notificationCategory(selected) : 'info';
  const canLoadMore = meta ? meta.current_page < meta.last_page : false;

  function handlePress(item: AppNotification) {
    if (!item.read) dispatch(markNotificationRead(item.id));
    setSelected(item);
  }

  function actionFor(item: AppNotification): { label: string; onPress: () => void } | undefined {
    const link = resolveNotificationLink(item, roles);
    if (!link) return undefined;
    return {
      label: link.label,
      onPress: () => {
        setSelected(null);
        link.open(navigation);
      },
    };
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
          const category = notificationCategory(item);
          const gradient = categoryGradient[category];
          return (
            <PressableScale scaleTo={0.98} onPress={() => handlePress(item)}>
              <Card style={[styles.row, !item.read && styles.rowUnread]}>
                {gradient ? (
                  <GradientIconChip icon={categoryIcon[category]} colors={gradient} size={40} iconSize={18} radius={12} />
                ) : (
                  <View style={[styles.iconCircle, { backgroundColor: categorySurface[category] }]}>
                    <Icon name={categoryIcon[category]} size={18} color={categoryColor[category]} />
                  </View>
                )}
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
        icon={categoryIcon[selectedCategory]}
        iconColor={categoryColor[selectedCategory]}
        iconSurface={categorySurface[selectedCategory]}
        gradientColors={categoryGradient[selectedCategory]}
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
