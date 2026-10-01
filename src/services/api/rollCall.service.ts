import { axiosInstance } from '@/services/api/axiosInstance';
import type {
  AbsenceReason,
  ApiResponse,
  CreateRollCallAgendaPayload,
  RollCallAgenda,
  RollCallAgendaDetail,
  RollCallAgendaList,
  RollCallAgendaReport,
  RollCallCompanyAgendaList,
  RollCallCompanyForm,
  RollCallCompanySubmitPayload,
  RollCallCompanySubmitResult,
  RollCallOfficer,
  RollCallPersonnelSearchItem,
  RollCallProgress,
  RollCallRepresentative,
  RollCallSessionType,
  RollCallSessionTypePayload,
  RollCallStats,
  RollCallTotals,
} from '@/types';

// Kekuatan Apel — agenda piket + pengisian per kompi. baseURL axios sudah termasuk `/api`.
// Endpoint lama (`/roll-calls/{session}/entries`, `/close`, `/personnel/search`) sudah tidak
// berlaku sejak 2026-09-26.

interface MessageResponse {
  success: boolean;
  message?: string;
}

const EMPTY_PROGRESS: RollCallProgress = { sudah: 0, total: 0, persen: 0, belum: 0 };

// `totals` di respons asli (dicek di device 2026-09-26) masih berkey Indonesia —
// `{ kompi, anggota, hadir, tidak_hadir, persen }` — walau dokumen menyebut key Inggris.
// Terima dua-duanya supaya aman kalau backend menyeragamkannya nanti.
function normalizeTotals(raw: any): RollCallTotals {
  return {
    company: raw?.company ?? raw?.kompi ?? 0,
    members: raw?.members ?? raw?.anggota ?? 0,
    present: raw?.present ?? raw?.hadir ?? 0,
    absent: raw?.absent ?? raw?.tidak_hadir ?? 0,
    persen: raw?.persen ?? raw?.percentage ?? 0,
  };
}

function normalizeAgenda(raw: any): RollCallAgenda {
  return {
    ...raw,
    wave: raw?.wave ?? 1,
    is_locked: !!raw?.is_locked,
    deadline: raw?.deadline ?? null,
    progress: { ...EMPTY_PROGRESS, ...(raw?.progress ?? {}) },
    totals: normalizeTotals(raw?.totals),
    my_submission: raw?.my_submission ?? [],
  };
}

// --- Agenda (piket / komandan) ---

export async function getRollCallAgendasApi(): Promise<RollCallAgendaList> {
  const { data } = await axiosInstance.get<ApiResponse<any>>('/roll-calls');
  const raw = data.data ?? {};
  return {
    can_create_agenda: !!raw.can_create_agenda,
    is_representative: !!raw.is_representative,
    represented_company: raw.represented_company ?? [],
    agendas: (raw.agendas ?? []).map(normalizeAgenda),
  };
}

export async function createRollCallAgendaApi(
  payload: CreateRollCallAgendaPayload,
): Promise<{ id: number; message: string }> {
  const { data } = await axiosInstance.post<ApiResponse<{ id: number }>>('/roll-calls/agenda', payload);
  return { id: data.data.id, message: data.message ?? 'Agenda apel dibuka.' };
}

export async function getRollCallAgendaApi(agendaId: number | string): Promise<RollCallAgendaDetail> {
  const { data } = await axiosInstance.get<ApiResponse<any>>(`/roll-calls/agenda/${agendaId}`);
  const raw = data.data ?? {};
  return {
    ...raw,
    wave: raw.wave ?? 1,
    is_locked: !!raw.is_locked,
    progress: { ...EMPTY_PROGRESS, ...(raw.progress ?? {}) },
    totals: normalizeTotals(raw.totals),
    recap: raw.recap ?? [],
    absent: raw.absent ?? [],
  };
}

// Laporan Piket Batalyon — `text` siap ditempel ke WhatsApp. Selalu diambil saat tombol ditekan
// supaya isinya mengikuti isian kompi terbaru.
export async function getRollCallAgendaReportApi(agendaId: number | string): Promise<RollCallAgendaReport> {
  const { data } = await axiosInstance.get<ApiResponse<RollCallAgendaReport>>(
    `/roll-calls/agenda/${agendaId}/report`,
  );
  return data.data;
}

export async function finishRollCallAgendaApi(agendaId: number | string): Promise<string> {
  const { data } = await axiosInstance.post<MessageResponse>(`/roll-calls/agenda/${agendaId}/finish`);
  return data.message ?? 'Agenda apel ditutup dan terkunci.';
}

export async function reopenRollCallAgendaApi(agendaId: number | string): Promise<string> {
  const { data } = await axiosInstance.post<MessageResponse>(`/roll-calls/agenda/${agendaId}/reopen`);
  return data.message ?? 'Agenda apel dibuka kembali.';
}

// --- Pengisian kompi (perwakilan kompi) ---

export async function getRollCallCompanyAgendasApi(): Promise<RollCallCompanyAgendaList> {
  const { data } = await axiosInstance.get<ApiResponse<any>>('/roll-calls/companies');
  const raw = data.data ?? {};
  return {
    company: raw.company ?? [],
    agendas: (raw.agendas ?? []).map((agenda: any) => ({
      ...agenda,
      wave: agenda.wave ?? 1,
      is_locked: !!agenda.is_locked,
      submission: agenda.submission ?? [],
    })),
  };
}

export async function getRollCallCompanyFormApi(
  agendaId: number | string,
  unitId: number | string,
): Promise<RollCallCompanyForm> {
  const { data } = await axiosInstance.get<ApiResponse<any>>(
    `/roll-calls/agenda/${agendaId}/companies/${unitId}`,
  );
  const raw = data.data ?? {};
  return {
    ...raw,
    agenda: { ...raw.agenda, is_locked: !!raw.agenda?.is_locked },
    saved_mode: raw.saved_mode ?? null,
    is_submitted: !!raw.is_submitted,
    members: raw.members ?? [],
    absence_reason: raw.absence_reason ?? [],
  };
}

// Body POST memakai array bersarang ala Laravel: `alasan[personnel_id]`, `alasan_lainnya[...]`,
// `catatan[...]` — dikirim sebagai objek JSON ber-key personnel_id (Laravel membacanya sama).
export async function submitRollCallCompanyApi(
  agendaId: number | string,
  unitId: number | string,
  payload: RollCallCompanySubmitPayload,
): Promise<RollCallCompanySubmitResult> {
  const { data } = await axiosInstance.post<
    ApiResponse<{ submitted_companies: number; total_companies: number }>
  >(`/roll-calls/agenda/${agendaId}/companies/${unitId}`, {
    mode: payload.mode,
    present: payload.present,
    alasan: payload.reasons,
    alasan_lainnya: payload.reasonOthers,
    catatan: payload.notes,
  });
  return {
    message: data.message ?? 'Apel kompi berhasil dikirim.',
    submitted_companies: data.data?.submitted_companies ?? 0,
    total_companies: data.data?.total_companies ?? 0,
  };
}

export async function getAbsenceReasonsApi(): Promise<AbsenceReason[]> {
  const { data } = await axiosInstance.get<ApiResponse<AbsenceReason[]>>('/roll-calls/absence-reasons');
  return data.data ?? [];
}

// --- Sesi piket ---

export async function getRollCallSessionTypesApi(): Promise<RollCallSessionType[]> {
  const { data } = await axiosInstance.get<ApiResponse<RollCallSessionType[]>>('/roll-calls/sessions');
  return (data.data ?? []).map(session => ({ ...session, is_active: !!session.is_active }));
}

export async function createRollCallSessionTypeApi(
  payload: RollCallSessionTypePayload,
): Promise<{ id: number; message: string }> {
  const { data } = await axiosInstance.post<ApiResponse<{ id: number }>>('/roll-calls/sessions', payload);
  return { id: data.data.id, message: data.message ?? 'Sesi piket ditambahkan.' };
}

export async function updateRollCallSessionTypeApi(
  sessionId: number,
  payload: RollCallSessionTypePayload,
): Promise<string> {
  const { data } = await axiosInstance.patch<MessageResponse>(`/roll-calls/sessions/${sessionId}`, payload);
  return data.message ?? 'Sesi piket diperbarui.';
}

export async function toggleRollCallSessionTypeApi(sessionId: number): Promise<boolean> {
  const { data } = await axiosInstance.post<ApiResponse<{ id: number; is_active: boolean }>>(
    `/roll-calls/sessions/${sessionId}/toggle`,
  );
  return !!data.data?.is_active;
}

export async function deleteRollCallSessionTypeApi(sessionId: number): Promise<string> {
  const { data } = await axiosInstance.delete<MessageResponse>(`/roll-calls/sessions/${sessionId}`);
  return data.message ?? 'Sesi piket dihapus.';
}

// --- Petugas piket batalyon ---

export async function getRollCallOfficersApi(): Promise<RollCallOfficer[]> {
  const { data } = await axiosInstance.get<ApiResponse<RollCallOfficer[]>>('/roll-calls/officers');
  return (data.data ?? []).map(officer => ({ ...officer, is_active: !!officer.is_active }));
}

export async function appointRollCallOfficerApi(userId: number): Promise<string> {
  const { data } = await axiosInstance.post<MessageResponse>('/roll-calls/officers', { user_id: userId });
  return data.message ?? 'Petugas piket ditunjuk.';
}

export async function toggleRollCallOfficerApi(officerId: number): Promise<boolean> {
  const { data } = await axiosInstance.post<ApiResponse<{ id: number; is_active: boolean }>>(
    `/roll-calls/officers/${officerId}/toggle`,
  );
  return !!data.data?.is_active;
}

export async function endRollCallOfficerApi(officerId: number): Promise<string> {
  const { data } = await axiosInstance.delete<MessageResponse>(`/roll-calls/officers/${officerId}`);
  return data.message ?? 'Penugasan petugas piket diakhiri.';
}

// --- Perwakilan kompi ---

export async function getRollCallRepresentativesApi(): Promise<RollCallRepresentative[]> {
  const { data } = await axiosInstance.get<ApiResponse<RollCallRepresentative[]>>(
    '/roll-calls/representatives',
  );
  return (data.data ?? []).map(rep => ({ ...rep, is_active: !!rep.is_active }));
}

// Menunjuk perwakilan untuk kompi yang sudah punya perwakilan otomatis menggantikan yang lama.
export async function appointRollCallRepresentativeApi(unitId: number, userId: number): Promise<string> {
  const { data } = await axiosInstance.post<MessageResponse>('/roll-calls/representatives', {
    unit_id: unitId,
    user_id: userId,
  });
  return data.message ?? 'Perwakilan kompi ditunjuk.';
}

export async function toggleRollCallRepresentativeApi(representativeId: number): Promise<boolean> {
  const { data } = await axiosInstance.post<ApiResponse<{ id: number; is_active: boolean }>>(
    `/roll-calls/representatives/${representativeId}/toggle`,
  );
  return !!data.data?.is_active;
}

export async function endRollCallRepresentativeApi(representativeId: number): Promise<string> {
  const { data } = await axiosInstance.delete<MessageResponse>(
    `/roll-calls/representatives/${representativeId}`,
  );
  return data.message ?? 'Penugasan perwakilan diakhiri.';
}

// --- Statistik & pencarian prajurit ---

export async function getRollCallStatsApi(params: { from?: string; to?: string } = {}): Promise<RollCallStats> {
  const { data } = await axiosInstance.get<ApiResponse<any>>('/roll-calls/stats', { params });
  const raw = data.data ?? {};
  return {
    period: raw.period ?? { from: params.from ?? '', to: params.to ?? '' },
    agendas: raw.agendas ?? 0,
    present: raw.present ?? 0,
    absent: raw.absent ?? 0,
    percentage: raw.percentage ?? 0,
    // Respons asli: { unit_id, company, members, submitted, pending, present, absent, percentage }
    // (dokumen menyebut `unit`) — terima dua-duanya.
    by_company: (raw.by_company ?? []).map((item: any) => ({
      unit_id: item.unit_id ?? null,
      company: item.company ?? item.unit ?? '-',
      members: item.members ?? null,
      present: item.present ?? 0,
      absent: item.absent ?? 0,
      percentage: item.percentage ?? null,
    })),
    absence_reasons: (raw.absence_reasons ?? []).map((item: any) => ({
      reason: item.reason ?? item.name ?? '-',
      total: item.total ?? 0,
    })),
  };
}

// Minimal 2 huruf (backend menolak yang lebih pendek).
export async function searchRollCallPersonnelApi(q: string): Promise<RollCallPersonnelSearchItem[]> {
  const { data } = await axiosInstance.get<ApiResponse<RollCallPersonnelSearchItem[]>>(
    '/roll-calls/personnel-search',
    { params: { q } },
  );
  return data.data ?? [];
}
