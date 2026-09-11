import type { PaginationMeta } from '@/types/catalog.types';

// Disposisi Surat — dua sisi:
//  - Pimpinan/operator (role komandan): catat surat masuk, cari penerima, terbitkan disposisi.
//  - Penerima/bawahan (semua anggota): lihat disposisi, buka detail (read-tracking otomatis),
//    tambah tindak lanjut, tandai selesai.
// Endpoint `/incoming-letters/*`, `/dispositions/*`, `/personnel/search`.
// baseURL axios sudah termasuk `/api`.

export type DispositionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'archived'
  | 'draft'
  | 'sent';

export type DispositionRecipientStatus = 'unread' | 'read' | 'completed';

export type SecurityLevel = 'biasa' | 'penting' | 'rahasia';

export type DispositionPriority = 'normal' | 'important' | 'urgent';

// File hasil pilih lampiran (bentuk file RN FormData).
export interface FilePickResult {
  uri: string;
  name: string;
  type: string;
  size?: number | null;
}

// --- Surat Masuk ---

export interface IncomingLetterListItem {
  id: number;
  letter_number: string;
  agenda_number: string | null;
  source_sender: string;
  letter_date: string; // YYYY-MM-DD
  received_date: string; // YYYY-MM-DD
  subject: string;
  summary: string | null;
  security_level: SecurityLevel;
  file_url: string | null;
  dispositions_count: number;
  created_at: string;
}

export interface IncomingLetterListParams {
  search?: string;
  security_level?: SecurityLevel;
  per_page?: number;
  page?: number;
}

export interface IncomingLetterListResult {
  items: IncomingLetterListItem[];
  meta: PaginationMeta;
}

// Ringkasan disposisi yang menempel di detail surat masuk (`dispositions[]`). Bentuk field belum
// dipastikan backend (contoh `dispositions: []`) — dibuat longgar & opsional.
export interface IncomingLetterDispositionRef {
  id: number;
  disposition_number?: string;
  instruction?: string;
  status?: DispositionStatus;
  status_label?: string;
  recipients_summary?: string;
  recipient_names?: string[];
  created_at?: string;
}

export interface IncomingLetterDetail extends Omit<IncomingLetterListItem, 'dispositions_count'> {
  dispositions: IncomingLetterDispositionRef[];
}

export interface CreateIncomingLetterPayload {
  letter_number: string;
  source_sender: string;
  letter_date: string; // YYYY-MM-DD
  received_date: string; // YYYY-MM-DD
  subject: string;
  security_level: SecurityLevel;
  agenda_number?: string;
  summary?: string;
}

// --- Disposisi ---

export interface DispositionSummary {
  unread_count: number;
  total_assigned: number;
  completed_count: number;
}

// Hanya "kotak masuk" penerima (`type=my`, di-set di service). Tidak ada daftar disposisi terkirim
// di backend — sisi komandan memakai detail surat masuk (`incoming_letter.dispositions[]`).
export interface DispositionListParams {
  status?: DispositionStatus;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface DispositionListItem {
  id: number;
  disposition_number: string;
  instruction: string;
  letter_subject: string;
  letter_number: string;
  sender_name: string;
  status: DispositionStatus;
  status_label: string;
  // Hanya untuk `type=my` (status user sebagai penerima).
  recipient_status?: DispositionRecipientStatus;
  recipient_status_label?: string;
  is_read?: boolean;
  read_at?: string | null;
  // Bisa ikut muncul di `type=sent` — opsional.
  priority?: DispositionPriority;
  recipients_count?: number;
  completed_recipients_count?: number;
  created_at: string;
}

export interface DispositionListResult {
  items: DispositionListItem[];
  meta: PaginationMeta;
}

export interface DispositionIncomingLetter {
  id: number;
  reference_number: string;
  agenda_number: string | null;
  sender: string;
  subject: string;
  file_url: string | null;
}

export interface DispositionSenderRef {
  id: number;
  name: string;
  position: string | null;
  photo?: string | null;
}

export interface DispositionRecipient {
  id: number;
  // Kadang backend menyertakan `personnel_id` (dibutuhkan untuk edit draf → PUT). Opsional.
  personnel_id?: number;
  personnel_name: string;
  status: DispositionRecipientStatus;
  read_at: string | null;
  completed_at?: string | null;
  photo?: string | null;
}

export interface DispositionFollowUp {
  id: number;
  user_name: string;
  notes: string;
  attachment_url: string | null;
  created_at: string;
}

export interface DispositionPermissions {
  can_follow_up: boolean;
  can_complete: boolean;
  // Bisa ikut dikirim backend untuk pembuat draf — opsional.
  can_edit?: boolean;
  can_delete?: boolean;
}

export interface DispositionDetail {
  id: number;
  disposition_number: string;
  instruction: string;
  notes: string | null;
  status: DispositionStatus;
  status_label: string;
  priority?: DispositionPriority;
  deadline?: string | null;
  // Status user aktif sebagai penerima (dari `my_recipient` di respons) — untuk sembunyikan
  // tombol aksi kalau bagian user sudah selesai.
  my_recipient_status?: DispositionRecipientStatus;
  incoming_letter: DispositionIncomingLetter;
  sender: DispositionSenderRef;
  recipients: DispositionRecipient[];
  follow_ups: DispositionFollowUp[];
  permissions: DispositionPermissions;
}

export interface CreateDispositionPayload {
  incoming_letter_id: number;
  recipient_personnel_ids: number[];
  priority: DispositionPriority;
  instruction: string;
  deadline?: string; // YYYY-MM-DD
  note?: string;
  action_type?: 'send' | 'draft';
}

export interface CreateDispositionResult {
  id: number;
  disposition_number: string;
  instruction: string;
  status: DispositionStatus;
  priority?: DispositionPriority;
}

export interface AddFollowUpPayload {
  notes: string;
  attachment?: FilePickResult | null;
}

export interface DispositionFollowUpResult {
  id: number;
  notes: string;
  attachment_url: string | null;
  created_at: string;
}

// Smart Search anggota aktif (GET /personnel/search) — item minimal.
export interface PersonnelSearchItem {
  id: number;
  full_name: string;
  service_number: string;
  photo?: string | null;
}
