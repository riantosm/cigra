import type { PaginationMeta } from '@/types/catalog.types';

// GET /activities/movements — pergerakan keluar/masuk personel satuan (Home Komandan).
// Lihat documentation/API_CONTRACT.md §2.2.

export type ActivityDirection = 'in' | 'out';

export interface ActivityMovementPersonnel {
  service_number: string;
  full_name: string;
  rank: string | null;
}

export interface ActivityMovement {
  id: number;
  direction: ActivityDirection | string;
  personnel: ActivityMovementPersonnel;
  location_label: string | null;
  purpose: string | null;
  note: string | null;
  occurred_at: string;
}

export interface ActivityMovementsResult {
  items: ActivityMovement[];
  meta: PaginationMeta | null;
}
