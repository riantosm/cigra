import { axiosInstance } from '@/services/api/axiosInstance';
import type { AppNotification, NotificationListMeta, NotificationListResult } from '@/types';

export interface NotificationsParams {
  page?: number;
  per_page?: number;
  only_unread?: boolean;
  type?: 'emergency' | 'announcement' | 'info' | 'system';
}

export async function getNotificationsApi(
  params: NotificationsParams = {},
): Promise<NotificationListResult> {
  const { data } = await axiosInstance.get<{
    success: boolean;
    data: AppNotification[];
    meta?: NotificationListMeta;
  }>('/notifications', { params });
  return { items: data.data, meta: data.meta ?? null };
}

export async function markNotificationReadApi(id: number | string): Promise<number> {
  const { data } = await axiosInstance.post<{ success: boolean; data: { unread_total: number } }>(
    `/notifications/${id}/read`,
  );
  return data.data?.unread_total ?? 0;
}

export async function markAllNotificationsReadApi(): Promise<number> {
  const { data } = await axiosInstance.post<{ success: boolean; data: { unread_total: number } }>(
    '/notifications/read-all',
  );
  return data.data?.unread_total ?? 0;
}
