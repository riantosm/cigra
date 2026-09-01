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

export type StnkStatus = 'active' | 'expiring_soon' | 'expired';

export interface MeVehicleAsset {
  id: number;
  brand_model: string;
  plate_number: string | null;
  stnk_valid_until: string | null;
  stnk_status: StnkStatus | string;
  stnk_status_label: string | null;
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

// --- GET /emergency-contacts (§6) ---
export type EmergencyContactCategory = 'command' | 'medical' | 'security' | 'general';

export interface EmergencyContact {
  id: number;
  label: string;
  phone: string;
  category: EmergencyContactCategory | string;
  description?: string | null;
}
