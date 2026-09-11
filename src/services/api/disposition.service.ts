import Config from 'react-native-config';

import { axiosInstance, getAuthToken } from '@/services/api/axiosInstance';
import type {
  AddFollowUpPayload,
  ApiResponse,
  CreateDispositionPayload,
  CreateDispositionResult,
  CreateIncomingLetterPayload,
  DispositionDetail,
  DispositionFollowUpResult,
  DispositionListItem,
  DispositionListParams,
  DispositionListResult,
  DispositionSummary,
  FilePickResult,
  IncomingLetterDetail,
  IncomingLetterListItem,
  IncomingLetterListParams,
  IncomingLetterListResult,
  PaginationMeta,
  PersonnelSearchItem,
} from '@/types';

// baseURL axios sudah termasuk suffix `/api`, jadi path di sini mulai dari `/dispositions/...`.
//   GET    /incoming-letters                → Daftar Surat Masuk (paginated, filter search/security_level)
//   POST   /incoming-letters                → Catat Surat Masuk Baru (multipart bila ada file)
//   GET    /incoming-letters/{id}           → Detail Surat Masuk (+ riwayat disposisi)
//   GET    /dispositions/summary            → Counter unread / total / completed
//   GET    /dispositions?type=my&status=&search=&page=  → Kotak masuk disposisi (penerima)
//   GET    /dispositions/{id}               → Detail Disposisi (buka = read_at otomatis di backend)
//   POST   /dispositions                    → Buat Disposisi Baru (send / draft)
//   PUT    /dispositions/{id}               → Perbarui Draft Disposisi
//   DELETE /dispositions/{id}               → Hapus / Batalkan Disposisi
//   POST   /dispositions/{id}/follow-ups    → Tambah Tindak Lanjut (multipart, notes + attachment?)
//   POST   /dispositions/{id}/complete      → Tandai Disposisi Selesai
//   GET    /personnel/search?q=             → Smart Search anggota aktif (id, full_name, service_number)

// Bentuk `{ data:[], meta }` (paginator kustom) yang dipakai list surat masuk & disposisi.
interface PaginatedResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
  meta?: Partial<PaginationMeta> & { last_page?: number };
  links?: unknown;
}

function normalizeMeta<T>(payload: PaginatedResponse<T>, fallbackPage: number): PaginationMeta {
  const meta = payload.meta ?? {};
  const perPage = meta.per_page ?? payload.data.length ?? 15;
  const currentPage = meta.current_page ?? fallbackPage;
  const lastPage =
    meta.last_page ?? (payload.data.length < perPage ? currentPage : currentPage + 1);
  return {
    current_page: currentPage,
    last_page: lastPage,
    per_page: perPage,
    total: meta.total ?? payload.data.length,
  };
}

// --- Surat Masuk ---

export async function getIncomingLettersApi(
  params: IncomingLetterListParams = {},
): Promise<IncomingLetterListResult> {
  const { data } = await axiosInstance.get<PaginatedResponse<IncomingLetterListItem>>(
    '/incoming-letters',
    { params },
  );
  return { items: data.data ?? [], meta: normalizeMeta(data, params.page ?? 1) };
}

export async function createIncomingLetterApi(
  payload: CreateIncomingLetterPayload,
  file?: FilePickResult | null,
): Promise<IncomingLetterDetail> {
  if (!file) {
    const { data } = await axiosInstance.post<ApiResponse<IncomingLetterDetail>>(
      '/incoming-letters',
      payload,
    );
    return data.data;
  }
  const form = new FormData();
  (Object.keys(payload) as (keyof CreateIncomingLetterPayload)[]).forEach(key => {
    const value = payload[key];
    if (value != null && value !== '') form.append(key, String(value));
  });
  form.append('file', file as unknown as Blob);
  const { data } = await axiosInstance.post<ApiResponse<IncomingLetterDetail>>(
    '/incoming-letters',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data.data;
}

export async function getIncomingLetterApi(id: number | string): Promise<IncomingLetterDetail> {
  const { data } = await axiosInstance.get<ApiResponse<IncomingLetterDetail>>(
    `/incoming-letters/${id}`,
  );
  return data.data;
}

// --- Disposisi (backend memakai bentuk nested; dinormalkan ke tipe datar internal) ---


export async function getDispositionSummaryApi(): Promise<DispositionSummary> {
  const { data } = await axiosInstance.get<ApiResponse<any>>('/dispositions/summary');
  const d = data.data ?? {};
  const total =
    d.total_assigned ??
    (Number(d.pending ?? 0) + Number(d.in_progress ?? 0) + Number(d.completed ?? 0));
  return {
    unread_count: Number(d.unread ?? d.unread_count ?? 0),
    total_assigned: Number(total),
    completed_count: Number(d.completed ?? d.completed_count ?? 0),
  };
}

function pickFirst<T>(...vals: (T | null | undefined)[]): T | undefined {
  for (const v of vals) if (v != null) return v;
  return undefined;
}

function mapRecipientStatus(
  value: unknown,
): 'unread' | 'read' | 'completed' | undefined {
  if (value === 'pending' || value === 'unread') return 'unread';
  if (value === 'read' || value === 'in_progress') return 'read';
  if (value === 'completed' || value === 'done') return 'completed';
  return undefined;
}

function normalizeListItem(raw: any): DispositionListItem {
  const letter = raw.letter ?? {};
  const disp = raw.disposition ?? raw;
  const my = raw.my_status ?? raw.my_recipient ?? {};
  return {
    id: raw.id,
    disposition_number: raw.disposition_number ?? disp.disposition_number ?? String(raw.id),
    instruction: pickFirst(disp.instruction_preview, disp.instruction, raw.instruction) ?? '',
    letter_subject: pickFirst(letter.subject, raw.letter_subject) ?? '',
    letter_number: pickFirst(letter.number, letter.reference_number, raw.letter_number) ?? '',
    sender_name: pickFirst(raw.sender?.name, raw.sender_name) ?? '',
    status: pickFirst(disp.status, raw.status) ?? 'pending',
    status_label: pickFirst(disp.status_label, raw.status_label) ?? '',
    // Backend memakai "pending" untuk penerima yang belum membaca.
    recipient_status: mapRecipientStatus(pickFirst(my.status, raw.recipient_status)),
    recipient_status_label: pickFirst(my.status_label, raw.recipient_status_label),
    is_read: pickFirst(my.is_read, raw.is_read),
    read_at: pickFirst(my.read_at, raw.read_at) ?? null,
    priority: pickFirst(disp.priority, raw.priority),
    recipients_count: pickFirst(raw.recipients_count, disp.recipients_count),
    completed_recipients_count: pickFirst(
      raw.completed_recipients_count,
      disp.completed_recipients_count,
    ),
    created_at: pickFirst(disp.created_at, raw.created_at) ?? '',
  };
}

function normalizeRecipient(raw: any): DispositionDetail['recipients'][number] {
  return {
    id: raw.id,
    personnel_id: raw.personnel_id,
    personnel_name: pickFirst(raw.personnel_name, raw.name) ?? '-',
    status: mapRecipientStatus(raw.status) ?? 'unread',
    read_at: raw.read_at ?? null,
    completed_at: raw.completed_at ?? null,
    photo: pickFirst(raw.photo, raw.personnel?.photo) ?? null,
  };
}

function normalizeFollowUp(raw: any): DispositionDetail['follow_ups'][number] {
  return {
    id: raw.id,
    user_name: pickFirst(raw.author?.name, raw.user_name, raw.name, raw.created_by?.name) ?? '-',
    notes: pickFirst(raw.content, raw.notes, raw.note) ?? '',
    attachment_url: pickFirst(raw.attachment_url, raw.attachment?.url) ?? null,
    created_at: raw.created_at ?? '',
  };
}

function normalizeDetail(raw: any): DispositionDetail {
  const letter = raw.incoming_letter ?? raw.letter ?? {};
  return {
    id: raw.id,
    disposition_number: raw.disposition_number ?? String(raw.id),
    instruction: raw.instruction ?? '',
    notes: pickFirst(raw.notes, raw.note) ?? null,
    status: raw.status ?? 'pending',
    status_label: raw.status_label ?? '',
    priority: raw.priority,
    deadline: raw.deadline ?? null,
    my_recipient_status: mapRecipientStatus(
      pickFirst(raw.my_recipient?.status, raw.my_status?.status),
    ),
    incoming_letter: {
      id: letter.id,
      reference_number: pickFirst(letter.reference_number, letter.number) ?? '',
      agenda_number: letter.agenda_number ?? null,
      sender: letter.sender ?? '',
      subject: letter.subject ?? '',
      file_url: pickFirst(letter.file_url, letter.attachment_url) ?? null,
    },
    sender: {
      id: raw.sender?.id ?? 0,
      name: raw.sender?.name ?? 'Pengirim tidak diketahui',
      position: pickFirst(raw.sender?.position, raw.sender?.unit) ?? null,
      photo: raw.sender?.photo ?? null,
    },
    recipients: Array.isArray(raw.recipients) ? raw.recipients.map(normalizeRecipient) : [],
    follow_ups: Array.isArray(raw.follow_ups) ? raw.follow_ups.map(normalizeFollowUp) : [],
    permissions: {
      can_follow_up: Boolean(raw.permissions?.can_follow_up),
      can_complete: Boolean(raw.permissions?.can_complete),
      can_edit: raw.permissions?.can_edit,
      can_delete: raw.permissions?.can_delete,
    },
  };
}

export async function getDispositionsApi(
  params: DispositionListParams = {},
): Promise<DispositionListResult> {
  // Backend hanya punya "kotak masuk" penerima (`type=my`) — tidak ada daftar disposisi yang
  // dibuat sendiri. Sisi komandan melacak disposisi terkirim lewat detail surat masuk.
  const { data } = await axiosInstance.get<PaginatedResponse<any>>('/dispositions', {
    params: { ...params, type: 'my' },
  });
  return {
    items: (data.data ?? []).map(normalizeListItem),
    meta: normalizeMeta(data, params.page ?? 1),
  };
}

export async function getDispositionApi(id: number | string): Promise<DispositionDetail> {
  const { data } = await axiosInstance.get<ApiResponse<any>>(`/dispositions/${id}`);
  return normalizeDetail(data.data);
}


export async function createDispositionApi(
  payload: CreateDispositionPayload,
): Promise<CreateDispositionResult> {
  const { data } = await axiosInstance.post<ApiResponse<CreateDispositionResult>>(
    '/dispositions',
    payload,
  );
  return data.data;
}

export async function updateDispositionApi(
  id: number | string,
  payload: CreateDispositionPayload,
): Promise<CreateDispositionResult> {
  const { data } = await axiosInstance.put<ApiResponse<CreateDispositionResult>>(
    `/dispositions/${id}`,
    payload,
  );
  return data.data;
}

export async function deleteDispositionApi(id: number | string): Promise<string> {
  const { data } = await axiosInstance.delete<ApiResponse<unknown>>(`/dispositions/${id}`);
  return data.message ?? 'Disposisi berhasil dihapus.';
}

// Tindak lanjut: multipart (`content` wajib + `attachment` opsional). Pola sama `createHealthRecordApi`.
export async function addDispositionFollowUpApi(
  id: number | string,
  payload: AddFollowUpPayload,
): Promise<DispositionFollowUpResult> {
  const form = new FormData();
  form.append('content', payload.notes);
  if (payload.attachment) form.append('attachment', payload.attachment as unknown as Blob);
  const { data } = await axiosInstance.post<ApiResponse<DispositionFollowUpResult>>(
    `/dispositions/${id}/follow-ups`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data.data;
}

export async function completeDispositionApi(
  id: number | string,
  notes?: string,
): Promise<string> {
  const { data } = await axiosInstance.post<ApiResponse<unknown>>(
    `/dispositions/${id}/complete`,
    notes ? { notes } : undefined,
  );
  return data.message ?? 'Disposisi berhasil ditandai selesai.';
}

// Smart Search anggota aktif. Asumsi path `/personnel/search` (roll-call punya varian ter-scope
// `/roll-calls/personnel/search`) — ganti di sini kalau backend memakai path lain.
export async function searchDispositionPersonnelApi(q: string): Promise<PersonnelSearchItem[]> {
  const { data } = await axiosInstance.get<ApiResponse<PersonnelSearchItem[]>>('/personnel/search', {
    params: { q },
  });
  return data.data ?? [];
}

// --- Unduh berkas terproteksi (blob-util di luar axios butuh URL penuh + header auth) ---

// `file_url` dari backend kadang absolut ke host lokal (mis. http://localhost:8000/api/...).
// Re-home ke API base yang dikonfigurasi supaya bisa diakses dari perangkat.
export function resolveSecureFileUrl(rawUrl: string): string {
  const base = (Config.API_BASE_URL ?? '').replace(/\/+$/, '');
  const marker = '/secure-files/';
  const idx = rawUrl.indexOf(marker);
  if (idx >= 0) return `${base}/secure-files/${rawUrl.slice(idx + marker.length)}`;
  return rawUrl;
}

export async function dispositionAuthHeader(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
