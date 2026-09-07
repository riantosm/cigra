import axios from 'axios';

import { axiosInstance } from '@/services/api/axiosInstance';
import type {
  ApiResponse,
  CompletePatrolResult,
  PatrolCheckinPayload,
  PatrolCheckinPhoto,
  PatrolCheckinResult,
  PatrolMonitoringMeta,
  PatrolMonitoringResult,
  PatrolMonitoringSession,
  PatrolMonitoringSummary,
  PatrolRoute,
  PatrolSession,
  StartPatrolPayload,
} from '@/types';

// baseURL axios sudah termasuk suffix `/api`, jadi path di sini mulai dari `/patrols/...`.
//   GET  /patrols/routes                      → List Rute Patroli (+ checkpoint berurut)
//   GET  /patrols/sessions/active             → Sesi Patroli Aktif Saya (in_progress milik user)
//   POST /patrols/sessions/start              → Mulai Patroli Baru { patrol_route_id, notes? }
//   POST /patrols/sessions/{session}/complete → Selesaikan Patroli
//   GET  /patrols/sessions/history            → Riwayat sesi patroli
//   GET  /patrols/sessions/{session}          → Detail satu sesi patroli
//   POST /patrols/sessions/{session}/checkin  → Check-in checkpoint (scan QR + selfie, multipart)
//   GET  /patrols/monitoring                  → Monitoring patroli (POV komandan) + KPI summary

export async function getPatrolRoutesApi(): Promise<PatrolRoute[]> {
  const { data } = await axiosInstance.get<ApiResponse<PatrolRoute[]>>('/patrols/routes');
  return data.data ?? [];
}

// Mengembalikan `null` bila tidak ada sesi berjalan (backend boleh balas `data: null` atau 404).
export async function getActivePatrolSessionApi(): Promise<PatrolSession | null> {
  try {
    const { data } = await axiosInstance.get<ApiResponse<PatrolSession | null>>(
      '/patrols/sessions/active',
    );
    return data.data ?? null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function startPatrolApi(payload: StartPatrolPayload): Promise<PatrolSession> {
  const { data } = await axiosInstance.post<ApiResponse<PatrolSession>>(
    '/patrols/sessions/start',
    payload,
  );
  return data.data;
}

// `POST /patrols/sessions/start` → `422 { success:false, message, data:<sesi in_progress> }`
// kalau petugas masih punya sesi berjalan. Kembalikan sesi itu (untuk navigasi), else null.
export function patrolAlreadyRunningSession(error: unknown): PatrolSession | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 422) return null;
  const existing = (error.response.data as ApiResponse<PatrolSession> | undefined)?.data;
  return existing && existing.status === 'in_progress' ? existing : null;
}

export async function completePatrolApi(
  sessionId: number | string,
): Promise<CompletePatrolResult> {
  const { data } = await axiosInstance.post<ApiResponse<CompletePatrolResult>>(
    `/patrols/sessions/${sessionId}/complete`,
  );
  return data.data;
}

// Check-in checkpoint: multipart (qr_code + koordinat GPS riil + foto selfie). `message` respons
// (mis. "Checkpoint 'Gerbang Utama' berhasil dicatat (Jarak: 0m).") digabung ke hasil.
export async function checkinPatrolCheckpointApi(
  sessionId: number | string,
  payload: PatrolCheckinPayload,
  photo: PatrolCheckinPhoto,
): Promise<PatrolCheckinResult> {
  const form = new FormData();
  form.append('qr_code', payload.qr_code);
  form.append('latitude', String(payload.latitude));
  form.append('longitude', String(payload.longitude));
  if (payload.notes) form.append('notes', payload.notes);
  form.append('photo', photo as unknown as Blob);

  const { data } = await axiosInstance.post<
    ApiResponse<Omit<PatrolCheckinResult, 'message'>> & { message?: string }
  >(`/patrols/sessions/${sessionId}/checkin`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return { ...data.data, message: data.message ?? 'Checkpoint berhasil dicatat.' };
}

// Monitoring patroli untuk komandan. Response: `{ success, message, summary, data:[…], meta }`
// (bukan `ApiResponse<T>` biasa — `summary` & `meta` di root). `status` opsional
// (`in_progress` / `completed`) memfilter list DAN `summary`.
export async function getPatrolMonitoringApi(
  params: {
    page?: number;
    per_page?: number;
    status?: 'in_progress' | 'completed';
  } = {},
): Promise<PatrolMonitoringResult> {
  const { data } = await axiosInstance.get<{
    success: boolean;
    message?: string;
    summary: PatrolMonitoringSummary;
    data: PatrolMonitoringSession[];
    meta?: PatrolMonitoringMeta;
  }>('/patrols/monitoring', { params });
  return {
    summary: data.summary ?? { total_sessions: 0, in_progress_count: 0, completed_count: 0 },
    sessions: data.data ?? [],
    meta: data.meta,
  };
}

export async function getPatrolSessionApi(
  sessionId: number | string,
): Promise<PatrolSession> {
  const { data } = await axiosInstance.get<ApiResponse<PatrolSession>>(
    `/patrols/sessions/${sessionId}`,
  );
  return data.data;
}

// Riwayat sesi patroli. Respons bisa berupa array polos di `data`, atau Laravel paginator
// (`data.data` = array) — kedua bentuk ditangani.
interface LaravelPaginator<T> {
  data: T[];
}

export async function getPatrolHistoryApi(params: {
  page?: number;
  per_page?: number;
} = {}): Promise<PatrolSession[]> {
  const { data } = await axiosInstance.get<
    ApiResponse<PatrolSession[] | LaravelPaginator<PatrolSession>>
  >('/patrols/sessions/history', { params });
  const payload = data.data;
  if (Array.isArray(payload)) return payload;
  return payload?.data ?? [];
}
