import type { PaginationMeta } from '@/types/catalog.types';

export interface PanicButtonPayload {
  latitude: number;
  longitude: number;
  address?: string;
  description?: string;
}

export interface PanicButtonResult {
  id: number;
  latitude: number;
  longitude: number;
  address?: string;
  description?: string;
  created_at?: string;
}

// --- GET /panic-buttons (list) + /{id} (detail) + PATCH /{id} — API_CONTRACT.md §4 ---

export type PanicButtonStatus = 'active' | 'acknowledged' | 'resolved';

export interface PanicButtonPersonnel {
  service_number: string;
  full_name: string;
  rank: string | null;
  unit: string | null;
  photo: string | null;
}

export interface PanicButtonListItem {
  id: number;
  status: PanicButtonStatus | string;
  personnel: PanicButtonPersonnel;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  address: string | null;
  description: string | null;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  handled_by: { id: number; name: string } | string | null;
}

export interface PanicButtonTimelineEntry {
  event: string;
  actor: string | null;
  at: string;
}

export interface PanicButtonDetail extends PanicButtonListItem {
  timeline: PanicButtonTimelineEntry[];
}

export interface PanicButtonListFilters {
  status: PanicButtonStatus | string | null;
  unit_id: number | null;
}

export interface PanicButtonListResult {
  items: PanicButtonListItem[];
  meta: PaginationMeta | null;
  filters: PanicButtonListFilters | null;
}

export interface UpdatePanicButtonPayload {
  status: 'acknowledged' | 'resolved';
  note?: string;
}
