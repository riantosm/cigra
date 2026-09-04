import type { LocationStatus } from '@/types/location.types';

// Endpoint berskup "user yang login" untuk Home Anggota — lihat
// documentation/API_CONTRACT_ANGGOTA.md. Semua envelope `{ success, data }` seragam dengan API lain.

// --- GET /me/id-card (§1) ---
export type IdCardVerificationStatus = 'verified' | 'pending' | 'unverified';

export interface MeIdCard {
  service_number: string;
  // Enum mentah; nilai selain di atas → fallback netral ("Belum Verifikasi").
  verification_status: IdCardVerificationStatus | string;
  verified_at: string | null;
  // String yang di-encode ke QR — default = NRP. Disediakan agar backend bisa ganti ke token
  // bertanda-tangan tanpa ubah client.
  qr_payload: string;
  qr_expires_at: string | null;
}

// --- GET /me/status (§2) ---
export type MePresenceKey = 'at_base' | 'off_base' | 'on_leave' | 'absent';

export interface MePresence {
  key: MePresenceKey | string;
  label: string;
  since: string | null;
}

export interface MeDuty {
  key: string;
  label: string;
  period_label: string | null;
  starts_at: string | null;
  ends_at: string | null;
}

export interface MeStatusLocation {
  label: string | null;
  accuracy_label: string | null;
  status: LocationStatus | string;
  captured_at: string | null;
}

export interface MeStatus {
  as_of: string;
  presence: MePresence | null;
  duty: MeDuty | null;
  location: MeStatusLocation | null;
}

// --- GET /me/assets (§3) ---
export interface MeWeaponAsset {
  id: number;
  weapon_number: string;
  serial_number: string | null;
  category: string | null;
  condition_status: string;
  condition_label: string | null;
  assigned_at: string | null;
}

export interface MeVehicleAsset {
  id: number;
  brand_model: string;
  plate_number: string | null;
  // Kategori kendaraan (mis. "roda_2" / "roda_4") — enum mentah.
  category: string | null;
  condition_status: string;
  condition_label: string | null;
}

export interface MeAssets {
  weapons: MeWeaponAsset[];
  vehicles: MeVehicleAsset[];
}

// --- GET /me/movements (§4) ---
export type MovementDirection = 'in' | 'out';

export interface MeMovement {
  id: number;
  direction: MovementDirection | string;
  occurred_at: string;
  location_label: string | null;
  purpose: string | null;
  note: string | null;
}

// --- GET /auth/me → data.family[] (anggota) ---
// Anggota keluarga (Persit) milik prajurit yang login. `id` = id rekam Persit yang diterima
// `GET /catalog/persit/{id}`, jadi tiap baris bisa dibuka ke detail Persit. `photo` biasanya
// placeholder SVG (data URI) → `isDisplayablePhoto` menolaknya → avatar inisial.
export interface MeFamilyMember {
  id: number;
  full_name: string;
  membership_number: string | null;
  // Hubungan keluarga ("Istri" / "Anak" / …) — tidak selalu ada di payload.
  family_relation?: string | null;
  spouse_personnel_id: number | null;
  phone: string | null;
  birth_place: string | null;
  birth_date: string | null;
  birth_date_formatted: string | null;
  blood_type: string | null;
  address: string | null;
  occupation: string | null;
  photo: string | null;
  photo_url: string | null;
  status: string;
}

// --- GET /me/family/{id} + /me/family/{id}/location (anggota) ---
// Versi berskup anggota untuk membuka anggota keluarga sendiri tanpa akses katalog Komandan
// (yang 403 untuk prajurit biasa). `{id}` = `MeFamilyMember.id`.

export interface MeFamilyLinkedSpouse {
  id: number;
  full_name: string;
  service_number: string;
  rank: string | null;
}

// Titik lokasi keluarga — dibuat longgar (semua opsional kecuali koordinat) karena payload
// contoh masih `null`; nama field mengikuti konvensi lokasi API lain.
export interface MeFamilyLocationPoint {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  captured_at?: string | null;
  source?: string | null;
}

export interface MeFamilyMemberDetail {
  id: number;
  full_name: string;
  membership_number: string | null;
  phone: string | null;
  birth_place: string | null;
  birth_date: string | null;
  birth_date_formatted?: string | null;
  blood_type: string | null;
  address: string | null;
  occupation: string | null;
  status: string;
  notes: string | null;
  photo_url: string | null;
  // Prajurit terkait — `husband` atau `wife` tergantung gender anggota.
  husband?: MeFamilyLinkedSpouse | null;
  wife?: MeFamilyLinkedSpouse | null;
  last_location: MeFamilyLocationPoint | null;
}

export interface MeFamilyMemberLocation {
  id: number;
  full_name: string;
  membership_number: string | null;
  photo_url: string | null;
  current_location: MeFamilyLocationPoint | null;
  location_history: MeFamilyLocationPoint[];
}

// --- GET /emergency-contacts (§6) ---
export type EmergencyContactCategory = 'command' | 'medical' | 'security' | 'general';

export interface EmergencyContact {
  id: number;
  label: string;
  phone: string;
  category: EmergencyContactCategory | string;
  description?: string | null;
}
