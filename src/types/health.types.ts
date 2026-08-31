import type { PaginationMeta } from '@/types/catalog.types';

// Modul kesehatan — dipakai role `petugas_kesehatan` (endpoint /health/*) dan anggota untuk
// melihat riwayatnya sendiri (/health/my). {personnel} di endpoint = NRP (service_number).
// Kontrak lengkap ada di API_CONTRACT.md §"API kesehatan".

// Ringkasan satu record pemeriksaan (dipakai di dashboard `recent`, `last_record`, list riwayat).
export interface HealthRecordSummary {
  id: number;
  personnel_id?: number;
  health_check_type: string;
  examined_at: string;
  result: string;
  examined_by: string;
  // Petugas hanya boleh mengubah dalam 24 jam setelah pencatatan (tenant_admin/superadmin tanpa
  // batas) — backend yang menghitung, FE cuma pakai flag ini untuk menampilkan/menyembunyikan
  // tombol "Ubah".
  can_edit: boolean;
  notes?: string | null;
  attachment_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface HealthCheckType {
  id: number;
  name: string;
  description: string | null;
}

export interface HealthDashboard {
  today_checked: number;
  month_total: number;
  recent: HealthRecordSummary[];
}

// Hasil pencarian anggota (GET /health/personnel/search).
export interface HealthPersonnelSearchItem {
  id: number;
  service_number: string;
  full_name: string;
  rank: string | null;
  unit: string | null;
  photo: string | null;
}

// Profil kesehatan anggota (GET /health/personnel/{nrp}).
export interface HealthPersonnelProfile {
  id: number;
  service_number: string;
  full_name: string;
  rank: string | null;
  position: string | null;
  unit: string | null;
  status: string;
  photo: string | null;
  health_summary: {
    total_records: number;
    last_record: HealthRecordSummary | null;
  };
}

// Detail lengkap pemeriksaan (GET /health/records/{id}) — sama seperti summary plus identitas
// anggota + catatan + attachment. Bentuk `personnel` menyusul kontrak; dibuat opsional/longgar.
export interface HealthRecordDetail extends HealthRecordSummary {
  notes: string | null;
  attachment_url: string | null;
  updated_at?: string | null;
  personnel?: {
    id: number;
    service_number: string;
    full_name: string;
    rank: string | null;
    unit: string | null;
    photo?: string | null;
  } | null;
}

// GET /health/my — riwayat milik anggota sendiri (read-only).
export interface HealthMyHistory {
  personnel: {
    id: number;
    service_number: string;
    full_name: string;
    rank: string | null;
    unit: string | null;
    photo: string | null;
  };
  records: HealthRecordSummary[];
}

// Body POST/PUT /health/personnel/{nrp}/records — tenant & petugas pemeriksa diambil dari token.
export interface HealthRecordInput {
  health_check_type_id: number;
  examined_at: string;
  result: string;
  notes?: string;
}

export interface HealthRecordListResult {
  items: HealthRecordSummary[];
  meta: PaginationMeta;
}

export interface HealthMyHistoryResult {
  data: HealthMyHistory;
  meta: PaginationMeta;
}
