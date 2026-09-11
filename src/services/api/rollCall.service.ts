import { axiosInstance } from '@/services/api/axiosInstance';
import type {
  AbsenceReason,
  ApiResponse,
  CreateRollCallPayload,
  RollCallCloseResult,
  RollCallDetail,
  RollCallEntry,
  RollCallEntryPayload,
  RollCallListResult,
  RollCallPersonnelSearchItem,
  RollCallSession,
} from '@/types';

// baseURL axios sudah termasuk suffix `/api`, jadi path di sini mulai dari `/roll-calls/...`.

export interface RollCallListParams {
  page?: number;
  per_page?: number;
}

// GET /roll-calls — Laravel paginator: data.data = array, meta pagination ada di root `data`.
interface LaravelPaginator<T> {
  current_page: number;
  data: T[];
  total: number;
  last_page?: number;
  per_page?: number;
}

export async function getRollCallsApi(params: RollCallListParams = {}): Promise<RollCallListResult> {
  const { data } = await axiosInstance.get<ApiResponse<LaravelPaginator<RollCallSession>>>(
    '/roll-calls',
    { params },
  );
  const page = data.data;
  const perPage = page.per_page ?? params.per_page ?? page.data.length;
  const lastPage =
    page.last_page ?? (page.data.length < perPage ? page.current_page : page.current_page + 1);
  return {
    items: page.data,
    meta: {
      current_page: page.current_page,
      last_page: lastPage,
      per_page: perPage,
      total: page.total,
    },
  };
}

export async function createRollCallApi(payload: CreateRollCallPayload): Promise<RollCallSession> {
  const { data } = await axiosInstance.post<ApiResponse<RollCallSession>>('/roll-calls', payload);
  return data.data;
}

// Backend mengirim field foto personel sebagai `foto` (dikonfirmasi dari `GET /roll-calls/{id}`);
// fallback ke `photo`/`photo_path` untuk jaga-jaga kalau endpoint lain memakai nama berbeda.
function personnelPhoto(raw: any): string | null {
  return raw?.foto ?? raw?.photo ?? raw?.photo_path ?? null;
}

function normalizePersonnelRef<T extends { id: number; full_name: string; service_number: string }>(
  raw: any,
): T & { photo: string | null } {
  return { ...raw, photo: personnelPhoto(raw) };
}

function normalizeRollCallDetail(raw: RollCallDetail): RollCallDetail {
  return {
    ...raw,
    present: raw.present.map(entry => ({ ...entry, personnel: normalizePersonnelRef(entry.personnel) })),
    absent: raw.absent.map(entry => ({ ...entry, personnel: normalizePersonnelRef(entry.personnel) })),
    unmarked: raw.unmarked.map(person => normalizePersonnelRef(person)),
  };
}

export async function getRollCallDetailApi(sessionId: number | string): Promise<RollCallDetail> {
  const { data } = await axiosInstance.get<ApiResponse<RollCallDetail>>(`/roll-calls/${sessionId}`);
  return normalizeRollCallDetail(data.data);
}

export async function submitRollCallEntryApi(
  sessionId: number | string,
  payload: RollCallEntryPayload,
): Promise<RollCallEntry> {
  const { data } = await axiosInstance.post<ApiResponse<RollCallEntry>>(
    `/roll-calls/${sessionId}/entries`,
    payload,
  );
  return data.data;
}

export async function closeRollCallApi(sessionId: number | string): Promise<RollCallCloseResult> {
  const { data } = await axiosInstance.post<ApiResponse<RollCallCloseResult>>(
    `/roll-calls/${sessionId}/close`,
  );
  return data.data;
}

export async function getAbsenceReasonsApi(): Promise<AbsenceReason[]> {
  const { data } = await axiosInstance.get<ApiResponse<AbsenceReason[]>>(
    '/roll-calls/absence-reasons',
  );
  return data.data;
}

// Smart search anggota aktif dalam satuan (real-time). `q` = nama / NRP.
export async function searchRollCallPersonnelApi(q: string): Promise<RollCallPersonnelSearchItem[]> {
  const { data } = await axiosInstance.get<ApiResponse<RollCallPersonnelSearchItem[]>>(
    '/roll-calls/personnel/search',
    { params: { q } },
  );
  return (data.data ?? []).map(item => normalizePersonnelRef<RollCallPersonnelSearchItem>(item));
}
