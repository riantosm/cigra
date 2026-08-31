import Config from 'react-native-config';

import { axiosInstance, getAuthToken } from '@/services/api/axiosInstance';
import type {
  ApiResponse,
  HealthCheckType,
  HealthDashboard,
  HealthMyHistoryResult,
  HealthPersonnelProfile,
  HealthPersonnelSearchItem,
  HealthRecordDetail,
  HealthRecordInput,
  HealthRecordListResult,
  HealthRecordSummary,
  PaginationMeta,
} from '@/types';

// Semua endpoint petugas butuh permission `health-officer.access` atau role
// petugas_kesehatan / tenant_admin / superadmin (backend 403). `/health/my` khusus anggota.
// baseURL axios sudah termasuk suffix `/api`, jadi path di sini mulai dari `/health/...`.

export interface HealthRecordsParams {
  type?: number | string;
  from?: string;
  to?: string;
  page?: number;
}

export async function getHealthDashboardApi(): Promise<HealthDashboard> {
  const { data } = await axiosInstance.get<ApiResponse<HealthDashboard>>('/health/dashboard');
  return data.data;
}

export async function getHealthCheckTypesApi(): Promise<HealthCheckType[]> {
  const { data } = await axiosInstance.get<ApiResponse<HealthCheckType[]>>('/health/check-types');
  return data.data;
}

// Cari anggota berdasar nama/NRP (min 2 karakter, maks 20 hasil di sisi backend).
export async function searchHealthPersonnelApi(q: string): Promise<HealthPersonnelSearchItem[]> {
  const { data } = await axiosInstance.get<ApiResponse<HealthPersonnelSearchItem[]>>(
    '/health/personnel/search',
    { params: { q } },
  );
  return data.data;
}

// {personnel} = NRP.
export async function getHealthPersonnelProfileApi(nrp: string): Promise<HealthPersonnelProfile> {
  const { data } = await axiosInstance.get<ApiResponse<HealthPersonnelProfile>>(
    `/health/personnel/${nrp}`,
  );
  return data.data;
}

export async function getHealthPersonnelRecordsApi(
  nrp: string,
  params: HealthRecordsParams = {},
): Promise<HealthRecordListResult> {
  const { data } = await axiosInstance.get<{
    success: boolean;
    data: HealthRecordSummary[];
    meta: PaginationMeta;
  }>(`/health/personnel/${nrp}/records`, { params });
  return { items: data.data, meta: data.meta };
}

// Input pemeriksaan. `attachment` opsional (PDF/JPG/PNG, maks 10 MB) — dikirim multipart kalau ada.
export interface HealthAttachmentFile {
  uri: string;
  name: string;
  type: string;
}

export async function createHealthRecordApi(
  nrp: string,
  payload: HealthRecordInput,
  attachment?: HealthAttachmentFile | null,
): Promise<HealthRecordSummary> {
  const url = `/health/personnel/${nrp}/records`;

  // Tanpa attachment → kirim JSON biasa (multipart bikin backend salah parse `health_check_type_id`
  // → "Jenis pemeriksaan tidak valid"). Multipart hanya kalau benar-benar ada file.
  if (!attachment) {
    const { data } = await axiosInstance.post<ApiResponse<HealthRecordSummary>>(url, {
      health_check_type_id: payload.health_check_type_id,
      examined_at: payload.examined_at,
      result: payload.result,
      ...(payload.notes ? { notes: payload.notes } : null),
    });
    return data.data;
  }

  const form = new FormData();
  form.append('health_check_type_id', String(payload.health_check_type_id));
  form.append('examined_at', payload.examined_at);
  form.append('result', payload.result);
  if (payload.notes) form.append('notes', payload.notes);
  form.append('attachment', attachment as unknown as Blob);
  const { data } = await axiosInstance.post<ApiResponse<HealthRecordSummary>>(url, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function getHealthRecordDetailApi(recordId: number | string): Promise<HealthRecordDetail> {
  const { data } = await axiosInstance.get<ApiResponse<HealthRecordDetail>>(
    `/health/records/${recordId}`,
  );
  return data.data;
}

// PUT tidak menerima attachment (lihat kontrak). Error 403 = periode edit (24 jam) sudah lewat —
// pesannya sudah ramah dari backend, cukup diteruskan lewat extractErrorMessage.
export async function updateHealthRecordApi(
  recordId: number | string,
  payload: HealthRecordInput,
): Promise<HealthRecordSummary> {
  const { data } = await axiosInstance.put<ApiResponse<HealthRecordSummary>>(
    `/health/records/${recordId}`,
    payload,
  );
  return data.data;
}

// GET /health/my — riwayat anggota sendiri (read-only). Bentuk response beda: data.personnel + data.records.
export async function getMyHealthHistoryApi(params: { page?: number } = {}): Promise<HealthMyHistoryResult> {
  const { data } = await axiosInstance.get<{
    success: boolean;
    data: HealthMyHistoryResult['data'];
    meta: PaginationMeta;
  }>('/health/my', { params });
  return { data: data.data, meta: data.meta };
}

// URL absolut endpoint attachment (dipakai react-native-blob-util yang butuh URL penuh, bukan
// path relatif axios). baseURL Config sudah termasuk `/api`.
export function healthRecordAttachmentUrl(recordId: number | string): string {
  const base = (Config.API_BASE_URL ?? '').replace(/\/+$/, '');
  return `${base}/health/records/${recordId}/attachment`;
}

// Header Authorization untuk request attachment di luar axios (blob-util).
export async function healthAuthHeader(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
