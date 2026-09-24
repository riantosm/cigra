import axios from 'axios';
import Config from 'react-native-config';

import { axiosInstance, getAuthToken } from '@/services/api/axiosInstance';
import type {
  ApiResponse,
  CoopBillDetail,
  CoopExportFormat,
  CoopMyBills,
  CoopOverview,
  CoopReportDetail,
  PaginationMeta,
} from '@/types';

// Tagihan Koperasi — seluruh endpoint dijaga module gate `coop_salary_report`: modul belum aktif
// untuk satuan → 403 `{ success:false, message:"Modul ini tidak diaktifkan ..." }`. Endpoint rekap
// satuan (`/{report}`, `/{report}/members/{row}`, `/{report}/export/*`) juga 403 untuk pengguna
// yang tidak berhak. Aksi tulis (unggah/hapus rekap) hanya di web admin.

const BASE = '/coop-salary-report';


function normalizeMeta(
  meta: Partial<PaginationMeta> | null | undefined,
  count: number,
  fallbackPage: number,
): PaginationMeta {
  const perPage = meta?.per_page ?? Math.max(count, 12);
  const currentPage = meta?.current_page ?? fallbackPage;
  return {
    current_page: currentPage,
    last_page: meta?.last_page ?? (count < perPage ? currentPage : currentPage + 1),
    per_page: perPage,
    total: meta?.total ?? count,
  };
}

// True untuk 403 — modul nonaktif ATAU tidak berhak. Home memakai ini untuk menyembunyikan
// section sepenuhnya (bukan menampilkan pesan error).
export function isCoopForbiddenError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403;
}

export interface CoopOverviewParams {
  year?: number;
  search?: string;
  page?: number;
  per_page?: number;
}

export async function getCoopOverviewApi(params: CoopOverviewParams = {}): Promise<CoopOverview> {
  const { data } = await axiosInstance.get<ApiResponse<CoopOverview>>(BASE, {
    params: { ...params, search: params.search || undefined },
  });
  const overview = data.data;
  return {
    ...overview,
    manager: overview.manager
      ? {
          ...overview.manager,
          reports: overview.manager.reports ?? [],
          meta: normalizeMeta(overview.manager.meta, overview.manager.reports?.length ?? 0, params.page ?? 1),
        }
      : null,
    member: overview.member
      ? {
          ...overview.member,
          rows: overview.member.rows ?? [],
          meta: normalizeMeta(overview.member.meta, overview.member.rows?.length ?? 0, params.page ?? 1),
        }
      : null,
  };
}

export interface CoopPageParams {
  page?: number;
  per_page?: number;
}

export async function getMyCoopBillsApi(params: CoopPageParams = {}): Promise<CoopMyBills> {
  const { data } = await axiosInstance.get<
    ApiResponse<Omit<CoopMyBills, 'meta'>> & { meta?: Partial<PaginationMeta> }
  >(`${BASE}/me`, { params });
  const rows = data.data.rows ?? [];
  return { ...data.data, rows, meta: normalizeMeta(data.meta, rows.length, params.page ?? 1) };
}

export async function getMyCoopBillDetailApi(rowId: number): Promise<CoopBillDetail> {
  const { data } = await axiosInstance.get<ApiResponse<CoopBillDetail>>(`${BASE}/me/${rowId}`);
  return data.data;
}

export interface CoopReportDetailParams extends CoopPageParams {
  search?: string;
  category?: string;
  linkage?: 'linked' | 'unlinked';
  sort?: 'name' | 'nrp' | 'total';
  direction?: 'asc' | 'desc';
}

export async function getCoopReportDetailApi(
  reportId: number,
  params: CoopReportDetailParams = {},
): Promise<CoopReportDetail> {
  const { data } = await axiosInstance.get<
    ApiResponse<Omit<CoopReportDetail, 'meta'>> & { meta?: Partial<PaginationMeta> }
  >(`${BASE}/${reportId}`, { params: { ...params, search: params.search || undefined } });
  const rows = data.data.rows ?? [];
  return {
    ...data.data,
    rows,
    top_members: data.data.top_members ?? [],
    meta: normalizeMeta(data.meta, rows.length, params.page ?? 1),
  };
}

export async function getCoopReportMemberDetailApi(
  reportId: number,
  rowId: number,
): Promise<CoopBillDetail> {
  const { data } = await axiosInstance.get<ApiResponse<CoopBillDetail>>(
    `${BASE}/${reportId}/members/${rowId}`,
  );
  return data.data;
}

// Path ekspor relatif (tanpa `/api`) — dipakai `utils/coopSalaryExport.ts`.
export function myCoopBillExportPath(rowId: number, format: CoopExportFormat): string {
  return `${BASE}/me/${rowId}/export/${format}`;
}

export function coopReportExportPath(reportId: number, format: CoopExportFormat): string {
  return `${BASE}/${reportId}/export/${format}`;
}

// Halaman cetak (`export/pdf`) = HTML teks → lewat axios, bukan react-native-blob-util (lihat
// catatan di coopSalaryExport.ts). `transformResponse` identitas supaya axios tak mencoba JSON.parse.
export async function getCoopPrintHtmlApi(path: string): Promise<string> {
  const { data } = await axiosInstance.get<string>(path, {
    responseType: 'text',
    headers: { Accept: 'text/html' },
    transformResponse: (raw: unknown) => raw,
  });
  return String(data);
}

// URL absolut untuk unduhan biner (react-native-blob-util, bukan axios — header auth dipasang
// manual lewat `coopAuthHeader`).
export function coopAbsoluteUrl(path: string): string {
  const base = (Config.API_BASE_URL ?? '').replace(/\/+$/, '');
  return `${base}${path}`;
}

export async function coopAuthHeader(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
