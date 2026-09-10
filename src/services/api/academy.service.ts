import { axiosInstance } from '@/services/api/axiosInstance';
import type {
  AcademyAssessment,
  AcademyAttempt,
  AcademyAttemptResult,
  AcademyAttemptStart,
  AcademyCommanderOverview,
  AcademyCompetency,
  AcademyInstructorScorePayload,
  AcademyMaterial,
  AcademyMaterialCompleteResult,
  AcademyPracticalAssessment,
  AcademyPracticalResultPayload,
  AcademyProgramDetail,
  AcademyProgramListItem,
  AcademyProgramListResult,
  AcademyProgramPov,
  AcademyResponsePayload,
  AcademyResultItem,
  AcademySummary,
  AcademyVerificationItem,
  AcademyVerificationListResult,
  AcademyVerifyPayload,
  ApiResponse,
  PaginationMeta,
} from '@/types';

// baseURL axios sudah termasuk suffix `/api`, jadi path di sini mulai dari `/academy/...`.
//
// === Endpoint Smart Academy — sesuai kontrak backend (dikonfirmasi 2026-09-09) ===
//   GET  /academy/me/summary
//   GET  /academy/me/results
//   GET  /academy/me/competencies
//   GET  /academy/programs?type=my|instructor|commander&status=&search=&per_page=
//   GET  /academy/programs/{id}
//   GET  /academy/materials/{id}
//   POST /academy/materials/{id}/complete
//   GET  /academy/assessments/{id}
//   POST /academy/assessments/{id}/attempts
//   GET  /academy/attempts/{attempt}
//   PUT  /academy/attempts/{attempt}/responses/{question}
//   POST /academy/attempts/{id}/submit
//   GET  /academy/attempts/{attempt}/result
//   GET  /academy/practical-assessments/{id}
//   POST /academy/practical-assessments/{id}/results
//   GET  /academy/instructor/pending-verifications
//   POST /academy/instructor/verify-result/{id}   (action: verify | reject)
//   POST /academy/instructor/practical-results
//   GET  /academy/commander/overview
//
// Tidak ada endpoint daftar peserta per program / drilldown personel komandan di kontrak —
// layar & tab yang bergantung padanya sudah dihapus.

interface PaginatedResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
  meta?: Partial<PaginationMeta> & { last_page?: number };
}

function normalizeMeta<T>(payload: PaginatedResponse<T>, fallbackPage: number): PaginationMeta {
  const meta = payload.meta ?? {};
  const rows = payload.data?.length ?? 0;
  const perPage = meta.per_page ?? rows ?? 15;
  const currentPage = meta.current_page ?? fallbackPage;
  const lastPage = meta.last_page ?? (rows < perPage ? currentPage : currentPage + 1);
  return {
    current_page: currentPage,
    last_page: lastPage,
    per_page: perPage,
    total: meta.total ?? rows,
  };
}

// ============================ Ringkasan & program ============================

export async function getAcademySummaryApi(): Promise<AcademySummary> {
  const { data } = await axiosInstance.get<ApiResponse<AcademySummary>>('/academy/me/summary');
  return data.data ?? {};
}

export interface AcademyProgramsParams {
  type?: AcademyProgramPov;
  status?: string;
  search?: string;
  per_page?: number;
  page?: number;
}

export async function getAcademyProgramsApi(
  params: AcademyProgramsParams = {},
): Promise<AcademyProgramListResult> {
  const { data } = await axiosInstance.get<PaginatedResponse<AcademyProgramListItem>>(
    '/academy/programs',
    { params },
  );
  return { items: data.data ?? [], meta: normalizeMeta(data, params.page ?? 1) };
}

export async function getAcademyProgramApi(id: number | string): Promise<AcademyProgramDetail> {
  const { data } = await axiosInstance.get<ApiResponse<AcademyProgramDetail>>(
    `/academy/programs/${id}`,
  );
  return data.data;
}

// ============================ Materi ============================

export async function getAcademyMaterialApi(id: number | string): Promise<AcademyMaterial> {
  const { data } = await axiosInstance.get<ApiResponse<AcademyMaterial>>(`/academy/materials/${id}`);
  return data.data;
}

export async function completeAcademyMaterialApi(
  id: number | string,
): Promise<AcademyMaterialCompleteResult> {
  const { data } = await axiosInstance.post<ApiResponse<AcademyMaterialCompleteResult>>(
    `/academy/materials/${id}/complete`,
  );
  return data.data;
}

// ============================ Assessment / attempt ============================

export async function getAcademyAssessmentApi(id: number | string): Promise<AcademyAssessment> {
  const { data } = await axiosInstance.get<ApiResponse<AcademyAssessment>>(
    `/academy/assessments/${id}`,
  );
  return data.data;
}

// POST /academy/assessments/{id}/attempts → { attempt_id, started_at, expires_at, questions[] }
export async function startAcademyAttemptApi(
  assessmentId: number | string,
): Promise<AcademyAttemptStart> {
  const { data } = await axiosInstance.post<ApiResponse<AcademyAttemptStart>>(
    `/academy/assessments/${assessmentId}/attempts`,
  );
  return data.data;
}

export async function getAcademyAttemptApi(attemptId: number | string): Promise<AcademyAttempt> {
  const { data } = await axiosInstance.get<ApiResponse<AcademyAttempt>>(
    `/academy/attempts/${attemptId}`,
  );
  return data.data;
}

export async function saveAcademyResponseApi(
  attemptId: number | string,
  questionId: number | string,
  payload: AcademyResponsePayload,
): Promise<void> {
  await axiosInstance.put(`/academy/attempts/${attemptId}/responses/${questionId}`, payload);
}

export async function submitAcademyAttemptApi(
  attemptId: number | string,
): Promise<AcademyAttemptResult> {
  const { data } = await axiosInstance.post<ApiResponse<AcademyAttemptResult>>(
    `/academy/attempts/${attemptId}/submit`,
  );
  return data.data;
}

export async function getAcademyAttemptResultApi(
  attemptId: number | string,
): Promise<AcademyAttemptResult> {
  const { data } = await axiosInstance.get<ApiResponse<AcademyAttemptResult>>(
    `/academy/attempts/${attemptId}/result`,
  );
  return data.data;
}

// ============================ Praktik ============================

export async function getAcademyPracticalAssessmentApi(
  id: number | string,
): Promise<AcademyPracticalAssessment> {
  const { data } = await axiosInstance.get<ApiResponse<AcademyPracticalAssessment>>(
    `/academy/practical-assessments/${id}`,
  );
  return data.data;
}

// Input mandiri anggota — `metric_values` object + `notes`, JSON biasa (bukan multipart).
export async function submitAcademyPracticalResultApi(
  id: number | string,
  payload: AcademyPracticalResultPayload,
): Promise<void> {
  await axiosInstance.post(`/academy/practical-assessments/${id}/results`, payload);
}

// ============================ Hasil & kompetensi ============================

export async function getAcademyResultsApi(): Promise<AcademyResultItem[]> {
  const { data } = await axiosInstance.get<ApiResponse<AcademyResultItem[]>>('/academy/me/results');
  return data.data ?? [];
}

export async function getAcademyCompetenciesApi(): Promise<AcademyCompetency[]> {
  const { data } = await axiosInstance.get<ApiResponse<AcademyCompetency[]>>(
    '/academy/me/competencies',
  );
  return data.data ?? [];
}

// ============================ POV Instruktur ============================

// Antrean verifikasi praktik self-entry.
export async function getAcademyVerificationsApi(
  params: { page?: number; per_page?: number } = {},
): Promise<AcademyVerificationListResult> {
  const { data } = await axiosInstance.get<PaginatedResponse<AcademyVerificationItem>>(
    '/academy/instructor/pending-verifications',
    { params },
  );
  return { items: data.data ?? [], meta: normalizeMeta(data, params.page ?? 1) };
}

// Verifikasi (action=verify + score) atau tolak (action=reject + rejection_reason).
export async function verifyAcademyResultApi(
  id: number | string,
  payload: AcademyVerifyPayload,
): Promise<void> {
  await axiosInstance.post(`/academy/instructor/verify-result/${id}`, payload);
}

// Input nilai praktik langsung oleh instruktur (endpoint kontrak — belum dipakai layar karena
// tidak ada endpoint daftar/pencarian personel di modul academy).
export async function submitAcademyInstructorScoreApi(
  payload: AcademyInstructorScorePayload,
): Promise<void> {
  await axiosInstance.post('/academy/instructor/practical-results', payload);
}

// ============================ POV Komandan ============================

export async function getAcademyCommanderOverviewApi(): Promise<AcademyCommanderOverview> {
  const { data } = await axiosInstance.get<ApiResponse<AcademyCommanderOverview>>(
    '/academy/commander/overview',
  );
  return data.data;
}
