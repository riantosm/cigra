import type { PaginationMeta } from '@/types/catalog.types';

// Kekuatan Apel (roll call) — dipakai role komandan. Endpoint `/roll-calls/*`.
// Kontrak lengkap ada di API_CONTRACT.md §"Kekuatan Apel".

export type RollCallStatus = 'open' | 'closed';
export type RollCallEntryStatus = 'present' | 'absent';

// Item di daftar sesi apel (GET /roll-calls). `recap` disertakan backend per item sejak
// 2026-09-02 (opsional supaya aman untuk data lama / respons tanpa field itu).
export interface RollCallSession {
  id: number;
  tenant_id: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  name: string | null;
  status: RollCallStatus;
  created_by: number | null;
  closed_by: number | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  recap?: RollCallRecap;
}

export interface RollCallListResult {
  items: RollCallSession[];
  meta: PaginationMeta;
}

export interface CreateRollCallPayload {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  name?: string;
}

// Opsi keterangan tidak hadir (GET /roll-calls/absence-reasons).
export interface AbsenceReason {
  id: number;
  name: string;
  description: string | null;
  sort_order: number;
}

// --- Detail & rekap (GET /roll-calls/{session}) ---

export interface RollCallRecap {
  total: number;
  present: number;
  absent: number;
  unmarked: number;
  percentage: number;
}

export interface RollCallBreakdownItem {
  name: string;
  count: number;
}

export interface RollCallPersonnelRef {
  id: number;
  full_name: string;
  service_number: string;
  photo?: string | null;
}

export interface RollCallPresentEntry {
  id: number;
  personnel_id: number;
  status: 'present';
  personnel: RollCallPersonnelRef;
}

export interface RollCallAbsentEntry {
  id: number;
  personnel_id: number;
  status: 'absent';
  absence_reason_id: number | null;
  note: string | null;
  absence_reason: { id: number; name: string } | null;
  personnel: RollCallPersonnelRef;
}

// `unmarked[]` mengembalikan objek Personnel langsung (id = personnel_id), bukan objek entry.
export interface RollCallUnmarkedPersonnel {
  id: number;
  full_name: string;
  service_number: string;
  photo?: string | null;
}

export interface RollCallDetail {
  session: Pick<RollCallSession, 'id' | 'tenant_id' | 'date' | 'time' | 'name' | 'status'>;
  recap: RollCallRecap;
  breakdown: RollCallBreakdownItem[];
  present: RollCallPresentEntry[];
  absent: RollCallAbsentEntry[];
  unmarked: RollCallUnmarkedPersonnel[];
}

// --- Input kehadiran (POST /roll-calls/{session}/entries) ---

export interface RollCallEntryPayload {
  personnel_id: number;
  status: RollCallEntryStatus;
  absence_reason_id?: number;
  note?: string;
}

export interface RollCallEntry {
  id: number;
  roll_call_session_id: number;
  personnel_id: number;
  status: RollCallEntryStatus;
  absence_reason_id: number | null;
  note: string | null;
  input_by_user_id: number;
  updated_at: string;
}

// Hasil smart search anggota (GET /roll-calls/personnel/search).
export interface RollCallPersonnelSearchItem {
  id: number;
  full_name: string;
  service_number: string;
  photo?: string | null;
}

// Hasil POST /roll-calls/{session}/close.
export interface RollCallCloseResult {
  id: number;
  status: 'closed';
  closed_by: number;
  closed_at: string;
}
