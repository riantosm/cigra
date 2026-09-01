import type { PaginationMeta } from '@/types/catalog.types';

// GET /notifications + POST /notifications/{id}/read + POST /notifications/read-all.
// Dipakai lonceng header untuk SEMUA role (komandan & anggota). Lihat API_CONTRACT.md §3.

export type AppNotificationType = 'emergency' | 'announcement' | 'info' | 'system';

export interface AppNotificationAction {
  type: string;
  id: number | string;
}

export interface AppNotification {
  id: number;
  type: AppNotificationType | string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  action: AppNotificationAction | null;
}

export interface NotificationListMeta extends PaginationMeta {
  unread_total: number;
}

export interface NotificationListResult {
  items: AppNotification[];
  meta: NotificationListMeta | null;
}
