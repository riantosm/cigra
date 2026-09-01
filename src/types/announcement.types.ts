import type { PaginationMeta } from '@/types/catalog.types';

// GET /announcements + POST /announcements — pengumuman & alert satuan.
// Lihat documentation/API_CONTRACT.md §2.3/§2.4.

export type AnnouncementType = 'announcement' | 'alert' | 'info';
export type AnnouncementSeverity = 'low' | 'normal' | 'high';
export type AnnouncementScope = 'all' | 'unit' | 'role';

export interface Announcement {
  id: number;
  type: AnnouncementType | string;
  title: string;
  body: string;
  severity: AnnouncementSeverity | string;
  created_by: { id: number; name: string } | null;
  published_at: string;
  // Ada di response POST / GET /announcements/mine, tidak selalu ada di list umum.
  scope_label?: string | null;
  recipients_count?: number | null;
}

export interface AnnouncementTarget {
  scope: AnnouncementScope;
  unit_ids: number[];
  role: string | null;
}

export interface CreateAnnouncementPayload {
  type: AnnouncementType;
  title: string;
  body: string;
  severity: 'normal';
  target: AnnouncementTarget;
}

export interface AnnouncementListResult {
  items: Announcement[];
  meta: PaginationMeta | null;
}
