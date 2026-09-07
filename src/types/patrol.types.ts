// Patroli (patrol route + checkpoint) — dipakai role komandan. Endpoint `/patrol-routes` &
// `/patrol-sessions/*`. Bentuk response mengikuti kontrak yang diberikan user; path URL
// diasumsikan mengikuti pola `/roll-calls` (lihat komentar di patrol.service.ts) — sesuaikan
// di service kalau backend memakai path lain.

export type PatrolSessionStatus = 'in_progress' | 'completed';

// Satu checkpoint dalam rute (GET /patrol-routes → data[].checkpoints[]).
export interface PatrolCheckpoint {
  id: number;
  name: string;
  sequence_order: number;
  qr_code: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  notes?: string | null;
}

// Petugas yang sedang menjalankan sesi di sebuah rute (GET /patrols/routes → status_summary).
export interface PatrolRouteOfficerRef {
  id: number;
  full_name: string;
  service_number: string;
  rank?: string | null;
}

// Ringkasan status rute untuk daftar rute: apakah masih bisa dipilih untuk dimulai, dan siapa
// yang sedang berpatroli di situ.
export interface PatrolRouteStatusSummary {
  is_selectable: boolean;
  has_ongoing_session: boolean;
  ongoing_session_id: number | null;
  ongoing_officer: PatrolRouteOfficerRef | null;
  completed_today_count: number;
}

// Rute patroli aktif beserta checkpoint berurut (GET /patrol-routes).
export interface PatrolRoute {
  id: number;
  name: string;
  code: string;
  description: string | null;
  checkpoints: PatrolCheckpoint[];
  checkpoints_count?: number;
  status_summary?: PatrolRouteStatusSummary;
}

// Rute yang menempel di objek sesi. `GET /patrols/sessions/active` & `/patrols/sessions/{id}`
// menyertakan `checkpoints[]`; `/patrols/sessions/history` hanya ringkasannya (tanpa checkpoints).
export interface PatrolSessionRoute {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  checkpoints?: PatrolCheckpoint[];
}

// Satu entri log checkpoint pada sesi berjalan (`logs[]`) — terisi setelah check-in.
export interface PatrolCheckpointLog {
  id: number;
  patrol_session_id: number;
  patrol_checkpoint_id: number;
  scanned_at: string;
  scanned_latitude?: number;
  scanned_longitude?: number;
  distance_meters?: number;
  is_valid_location?: boolean;
  notes?: string | null;
  // Path relatif foto selfie (mis. "patrol/photos/xxx.jpg") — dilayani via
  // `<API_BASE>/secure-files/<path>` (pakai `SecureImage`). `photo_url` = URL siap pakai kalau ada.
  photo_path?: string | null;
  photo_url?: string | null;
  checkpoint?: PatrolCheckpoint;
}

// Sesi patroli (GET /patrols/sessions/active, /patrols/sessions/{id}, POST /patrols/sessions/start).
export interface PatrolSession {
  id: number;
  patrol_route_id?: number;
  officer_personnel_id?: number;
  status: PatrolSessionStatus;
  started_at: string;
  completed_at?: string | null;
  total_checkpoints: number;
  completed_checkpoints: number;
  notes?: string | null;
  route?: PatrolSessionRoute;
  logs?: PatrolCheckpointLog[];
}

export interface StartPatrolPayload {
  patrol_route_id: number;
  notes?: string;
}

// Hasil POST /patrols/sessions/{id}/complete.
export interface CompletePatrolResult {
  id: number;
  status: 'completed';
  completed_at: string;
}

// --- Check-in checkpoint (scan QR + selfie) ---
// POST /patrols/sessions/{session}/checkin (multipart).

export interface PatrolCheckinPayload {
  qr_code: string;
  latitude: number;
  longitude: number;
  notes?: string;
}

// Foto selfie yang dikirim multipart (bentuk file RN FormData).
export interface PatrolCheckinPhoto {
  uri: string;
  name: string;
  type: string;
}

export interface PatrolCheckinProgress {
  total_checkpoints: number;
  completed_checkpoints_count: number;
  remaining_checkpoints_count: number;
  is_all_completed: boolean;
  percentage: number;
}

export interface PatrolCheckinResult {
  message: string;
  is_valid_location: boolean;
  distance_meters: number;
  radius_tolerance_meters: number;
  progress: PatrolCheckinProgress;
}

// --- Monitoring patroli (POV komandan) — GET /patrols/monitoring ---
// Komandan hanya memantau; tidak ikut patroli.

export interface PatrolMonitoringSummary {
  total_sessions: number;
  in_progress_count: number;
  completed_count: number;
}

export interface PatrolMonitoringLog {
  id: number;
  checkpoint: { id: number; name: string; sequence_order: number; qr_code: string };
  scanned_at: string;
  scanned_latitude?: number | null;
  scanned_longitude?: number | null;
  distance_meters?: number | null;
  is_valid_location?: boolean;
  // URL siap pakai (bukan path) — dilayani via `<host>/api/secure-files/...`, render pakai `SecureImage`.
  photo_url?: string | null;
  notes?: string | null;
}

export interface PatrolMonitoringSession {
  id: number;
  status: PatrolSessionStatus;
  started_at: string;
  completed_at?: string | null;
  duration_minutes: number;
  total_checkpoints: number;
  completed_checkpoints: number;
  progress_percentage: number;
  has_location_anomaly: boolean;
  notes?: string | null;
  route: { id: number; name: string; code: string };
  officer: PatrolRouteOfficerRef;
  logs: PatrolMonitoringLog[];
}

export interface PatrolMonitoringMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface PatrolMonitoringResult {
  summary: PatrolMonitoringSummary;
  sessions: PatrolMonitoringSession[];
  meta?: PatrolMonitoringMeta;
}

export type PatrolMonitoringStatusFilter = 'all' | 'in_progress' | 'completed';
