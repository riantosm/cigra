import type { PaginationMeta } from '@/types/catalog.types';

// GET /notifications + POST /notifications/{id}/read + POST /notifications/read-all.
// Dipakai lonceng header untuk SEMUA role (komandan & anggota). Lihat API_CONTRACT.md §3.

export type AppNotificationType =
  | 'emergency'
  | 'panic_button'
  | 'announcement'
  | 'info'
  | 'system'
  | 'disposition';

// Isi `action` beda per jenis notifikasi; id-nya dikirim backend sebagai string ("41"). Bentuk yang
// terlihat di API live (2026-10-02):
//   panic_button → { type:'emergency', source:'panic_button', panic_button_id, maps_url, … }
//   disposition_* → { type:'disposition_follow_up' | …, action:'open_disposition', disposition_id }
//   roll_call_*  → { type:'roll_call', event:'dibuka', status:'open', agenda_id }
// Dibaca lewat `utils/notificationAction.ts`, jangan langsung di layar.
export interface AppNotificationAction {
  type: string;
  /** Bentuk lama di API_CONTRACT §3 (`{ type, id }`) — tetap didukung. */
  id?: number | string;
  source?: string;
  action?: string;
  event?: string;
  status?: string;
  panic_button_id?: number | string;
  disposition_id?: number | string;
  agenda_id?: number | string;
  [key: string]: unknown;
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
