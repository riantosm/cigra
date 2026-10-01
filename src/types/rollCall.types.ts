// Kekuatan Apel — agenda piket batalyon + pengisian per kompi (endpoint `/roll-calls/*`).
// Alur: komandan / petugas piket membuka agenda → perwakilan tiap kompi mengisi kehadiran →
// piket memantau rangkuman lalu menutup agenda. Kontrak di API_CONTRACT.md §"Kekuatan Apel".
// Sebagian key masih berbahasa Indonesia di backend (progress.sudah/belum/persen, totals.persen).

// `open` = masih bisa diisi (kecuali `is_locked` karena lewat jam berakhir sesi). Nilai lain
// (agenda sudah ditutup lewat `/finish`) diperlakukan sebagai "ditutup".
export type RollCallAgendaStatus = 'open' | string;

// Cara pencatatan kehadiran kompi. `present` = tandai yang hadir, `absent` = tandai yang tidak.
export type RollCallMode = 'present' | 'absent';

export interface RollCallProgress {
  sudah: number;
  total: number;
  persen: number;
  belum: number;
}

// Jumlah dari kompi yang SUDAH mengirim saja. Dinormalkan service dari key Indonesia yang
// dikirim backend (`kompi`, `anggota`, `hadir`, `tidak_hadir`, `persen`).
export interface RollCallTotals {
  company: number;
  members: number;
  present: number;
  absent: number;
  persen: number;
}

export interface RollCallCompanyRef {
  id: number;
  name: string;
}

export interface RollCallSubmission {
  unit_id: number;
  is_submitted: boolean;
  present: number;
  absent: number;
}

// --- GET /roll-calls ---

export interface RollCallAgenda {
  id: number;
  session: string;
  date: string; // YYYY-MM-DD
  wave: number;
  status: RollCallAgendaStatus;
  is_locked: boolean;
  deadline: string | null; // ISO-8601
  progress: RollCallProgress;
  totals: RollCallTotals;
  my_submission: RollCallSubmission[];
}

export interface RollCallAgendaList {
  can_create_agenda: boolean;
  is_representative: boolean;
  represented_company: RollCallCompanyRef[];
  agendas: RollCallAgenda[];
}

export interface CreateRollCallAgendaPayload {
  roll_call_session_type_id: number;
  date: string; // YYYY-MM-DD
  wave?: number;
  notes?: string;
}

// --- GET /roll-calls/agenda/{agenda} ---

export interface RollCallRecapItem {
  unit_id: number;
  company: string;
  submitted: boolean;
  members: number;
  present: number;
  absent: number;
  submitted_by: string | null;
  submitted_at: string | null;
}

export interface RollCallAbsentPerson {
  name: string;
  nrp: string | null;
  rank: string | null;
  company: string | null;
  absence_reason: string | null;
  note: string | null;
}

export interface RollCallAgendaDetail {
  id: number;
  session: string;
  date: string;
  wave: number;
  status: RollCallAgendaStatus;
  is_locked: boolean;
  progress: RollCallProgress;
  totals: RollCallTotals;
  recap: RollCallRecapItem[];
  absent: RollCallAbsentPerson[];
}

// --- GET /roll-calls/agenda/{agenda}/report (Laporan Piket Batalyon, siap kirim WhatsApp) ---
// `text` = laporan tersusun, sama persis dengan tombol "Copy untuk WhatsApp" di web. Blok `agenda`
// memakai key berbahasa Indonesia. Saat ini app hanya memakai `text` (tombol di Rangkuman).

export interface RollCallAgendaReport {
  agenda: {
    id: number;
    sesi: string;
    tanggal: string;
    tanggal_teks: string;
    gelombang: number;
    status: RollCallAgendaStatus;
    terkunci: boolean;
    batas_waktu: string | null; // "YYYY-MM-DD HH:mm"
    dibuka_oleh: string | null;
    ditutup_oleh: string | null;
  };
  strength: {
    actual_strength: number;
    companies_total: number;
    companies_reported: number;
    companies_pending: number;
    reported_members: number;
    present: number;
    absent: number;
    present_percent: number;
  };
  per_company: {
    unit_id: number;
    company: string;
    is_reported: boolean;
    reported_by: string | null;
    submitted_at: string | null; // "HH:mm"
    members: number;
    present: number;
    absent: number;
    present_percent: number;
  }[];
  absentees: {
    personnel_id: number;
    rank: string | null;
    name: string;
    service_number: string | null;
    company: string | null;
    reason: string | null;
    note: string | null;
  }[];
  absent_by_reason: Record<string, number>;
  by_rank_group: Record<string, { hadir: number; tidak_hadir: number; total: number }>;
  officers: { piket: unknown[]; perwakilan: unknown[] };
  text: string;
}

// --- GET /roll-calls/companies (daftar agenda milik perwakilan) ---

export interface RollCallCompanyAgenda {
  id: number;
  session: string;
  date: string;
  wave: number;
  is_locked: boolean;
  submission: RollCallSubmission[];
}

export interface RollCallCompanyAgendaList {
  company: RollCallCompanyRef[];
  agendas: RollCallCompanyAgenda[];
}

// --- GET|POST /roll-calls/agenda/{agenda}/companies/{unit} ---

export interface RollCallFormMember {
  personnel_id: number;
  name: string;
  nrp: string | null;
  rank: string | null;
  unit: string | null;
  // null = belum pernah diisi.
  present: boolean | null;
  absence_reason_id: number | null;
  absence_reason_other: string | null;
  note: string | null;
}

export interface RollCallCompanyForm {
  agenda: { id: number; session: string; date: string; is_locked: boolean };
  company: RollCallCompanyRef;
  saved_mode: RollCallMode | null;
  is_submitted: boolean;
  members: RollCallFormMember[];
  absence_reason: { id: number; name: string }[];
}

// Alasan per anggota: id keterangan, atau 'lainnya' (teks bebas di `reasonOther`).
export type RollCallReasonChoice = number | 'lainnya';

export interface RollCallCompanySubmitPayload {
  mode: RollCallMode;
  present: number[];
  reasons: Record<number, RollCallReasonChoice>;
  reasonOthers: Record<number, string>;
  notes: Record<number, string>;
}

export interface RollCallCompanySubmitResult {
  message: string;
  submitted_companies: number;
  total_companies: number;
}

// GET /roll-calls/absence-reasons
export interface AbsenceReason {
  id: number;
  name: string;
  note_label: string | null;
}

// --- Sesi piket (GET|POST /roll-calls/sessions, PATCH|DELETE /{session}, POST /{session}/toggle) ---

export interface RollCallSessionType {
  id: number;
  name: string;
  code: string | null;
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  description: string | null;
  sort_order: number | null;
  is_active: boolean;
}

export interface RollCallSessionTypePayload {
  name?: string;
  code?: string | null;
  start_time?: string; // HH:MM
  end_time?: string; // HH:MM
  description?: string | null;
  sort_order?: number | null;
  is_active?: boolean;
}

// --- Petugas piket (GET|POST /roll-calls/officers, POST /{officer}/toggle, DELETE /{officer}) ---

export interface RollCallOfficer {
  id: number;
  user_id: number;
  name: string;
  username: string | null;
  is_active: boolean;
  appointed_at: string | null;
}

// --- Perwakilan kompi (GET|POST /roll-calls/representatives, toggle, DELETE) ---

export interface RollCallRepresentative {
  id: number;
  unit_id: number;
  company: string;
  user_id: number;
  name: string;
  username: string | null;
  is_active: boolean;
}

// --- GET /roll-calls/stats ---

export interface RollCallStats {
  period: { from: string; to: string };
  agendas: number;
  present: number;
  absent: number;
  percentage: number;
  by_company: {
    unit_id: number | null;
    company: string;
    members: number | null;
    present: number;
    absent: number;
    // null = kompi belum pernah mengirim pada periode ini.
    percentage: number | null;
  }[];
  absence_reasons: { reason: string; total: number }[];
}

// --- GET /roll-calls/personnel-search?q= ---
// `id` dipakai sebagai `user_id` saat menunjuk petugas / perwakilan.
export interface RollCallPersonnelSearchItem {
  id: number;
  name: string;
  username: string | null;
  rank: string | null;
  company: string | null;
}
