import type { PaginationMeta } from './catalog.types';

// Tagihan Koperasi — `/api/coop-salary-report/*`. Satu menu, respons dinamis: `mode` `manager`
// (rekap satuan, blok `manager` terisi) atau `member` (`manager: null`). Blok `member` tetap terisi
// untuk admin/komandan yang punya data personil sendiri. Seluruh rupiah dikirim sebagai angka +
// teks siap tampil (`*_formatted`) — tampilkan teks backend apa adanya kalau ada.

// Tujuh jenis tagihan yang selalu dikirim backend.
export type CoopCategoryKey =
  | 'toko'
  | 'belanja_wajib'
  | 'sekunder'
  | 'air_prt_rudi'
  | 'usipa'
  | 'simpanan_wajib'
  | 'ukp';

export type CoopMode = 'manager' | 'member';

export type CoopTrendDirection = 'up' | 'down' | 'flat';

export interface CoopCategoryRef {
  key: CoopCategoryKey | string;
  label: string;
}

export interface CoopCategoryAmount extends CoopCategoryRef {
  amount: number;
  amount_formatted: string;
}

export interface CoopCapabilities {
  can_view_all_reports: boolean;
  can_manage_reports: boolean;
  can_export: boolean;
  can_open_any_member: boolean;
  has_own_tagihan: boolean;
}

export interface CoopIdentity {
  personnel_id: number | null;
  service_number: string | null;
  full_name: string | null;
  rank?: string | null;
  unit?: string | null;
  position?: string | null;
  // `personnel` (akun prajurit) / `persit` (akun keluarga → data prajurit tertaut).
  source?: string | null;
}

export interface CoopPeriod {
  month: number;
  month_label: string;
  year: number;
  label: string;
  slug?: string;
}

// --- Blok manager (rekap satuan) ---

export interface CoopManagerLatestPeriod {
  id: number;
  period_label: string;
  period_month: number;
  period_year: number;
  total_amount_formatted: string;
}

export interface CoopManagerSummary {
  periods: number;
  members: number;
  total_amount: number;
  total_amount_formatted: string;
  average_amount: number;
  average_amount_formatted: string;
  latest_period: CoopManagerLatestPeriod | null;
  latest_unlinked_count: number;
}

export interface CoopManagerTrend {
  labels: string[];
  totals: number[];
  members: number[];
}

export interface CoopReportListItem {
  id: number;
  title: string;
  period_label: string;
  period_slug: string;
  member_count: number;
  linked_count: number;
  unlinked_count: number;
  total_amount: number;
  total_amount_formatted: string;
  source_filename: string | null;
  uploaded_at: string | null;
}

export interface CoopManagerBlock {
  summary: CoopManagerSummary;
  trend: CoopManagerTrend;
  year_options: number[];
  reports: CoopReportListItem[];
  meta: PaginationMeta | null;
}

// --- Blok member (tagihan sendiri) ---

export interface CoopMemberLatest {
  id: number;
  total?: number;
  total_formatted: string;
  period?: { label: string };
}

export interface CoopMemberSummary {
  periods: number;
  total_amount: number;
  total_amount_formatted: string;
  average_amount: number;
  average_amount_formatted: string;
  highest_amount: number;
  highest_amount_formatted: string;
  latest: CoopMemberLatest | null;
}

export interface CoopMemberTrend {
  labels: string[];
  values: number[];
}

export interface CoopMemberRow {
  id: number;
  report_id?: number;
  nrp: string;
  name: string;
  rank_name?: string | null;
  is_linked?: boolean;
  period: CoopPeriod;
  // Hanya dikirim oleh `GET /coop-salary-report/me` (tidak oleh blok member endpoint utama).
  categories?: CoopCategoryAmount[];
  total: number;
  total_formatted: string;
}

export interface CoopMemberBlock {
  identity: CoopIdentity;
  summary: CoopMemberSummary;
  trend: CoopMemberTrend;
  rows: CoopMemberRow[];
  meta: PaginationMeta | null;
}

// `GET /coop-salary-report`
export interface CoopOverview {
  mode: CoopMode;
  categories: CoopCategoryRef[];
  capabilities: CoopCapabilities;
  identity: CoopIdentity | null;
  manager: CoopManagerBlock | null;
  member: CoopMemberBlock | null;
}

// `GET /coop-salary-report/me` — `meta` ada di root response, dinormalisasi ke sini.
export interface CoopMyBills {
  identity: CoopIdentity | null;
  summary: CoopMemberSummary;
  trend: CoopMemberTrend;
  rows: CoopMemberRow[];
  meta: PaginationMeta;
}

// `GET /coop-salary-report/me/{row}` dan `/{report}/members/{row}` (struktur identik,
// `own_view` false untuk tampilan pengelola).
export interface CoopBillDetail {
  id: number;
  nrp: string;
  name: string;
  rank_name?: string | null;
  own_view: boolean;
  period: CoopPeriod;
  identity: CoopIdentity | null;
  categories: CoopCategoryAmount[];
  total: number;
  total_formatted: string;
  composition?: { labels: string[]; values: number[] };
  series?: { labels: string[]; values: number[] };
  previous_period: {
    row_id: number;
    label: string;
    total: number;
    total_formatted: string;
  } | null;
  // null pada periode pertama.
  comparison: {
    delta: number;
    delta_formatted: string;
    delta_percent: number;
    trend: CoopTrendDirection;
  } | null;
  history: {
    row_id: number;
    period_label: string;
    total: number;
    total_formatted: string;
  }[];
}

// `GET /coop-salary-report/{report}`
export interface CoopReportDetailInfo extends Omit<CoopReportListItem, 'uploaded_at'> {
  categories: CoopCategoryAmount[];
  uploaded_by: string | null;
  uploaded_at: string | null;
}

export interface CoopReportMemberRow {
  id: number;
  row_number: number;
  nrp: string;
  name: string;
  rank_name: string | null;
  personnel_id: number | null;
  is_linked: boolean;
  total: number;
  total_formatted: string;
  personnel: { id: number; service_number: string; full_name: string } | null;
}

export interface CoopTopMember {
  id: number;
  name: string;
  nrp: string;
  rank_name?: string | null;
  is_linked?: boolean;
  total: number;
  total_formatted: string;
}

export interface CoopReportDetail {
  report: CoopReportDetailInfo;
  composition?: { labels: string[]; values: number[] };
  top_members: CoopTopMember[];
  rows: CoopReportMemberRow[];
  meta: PaginationMeta;
}

export type CoopExportFormat = 'excel' | 'pdf';
