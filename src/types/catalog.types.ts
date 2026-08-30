export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// --- Personnel ---

export interface PersonnelListItem {
  id: number;
  service_number: string;
  full_name: string;
  rank: string | null;
  position: string | null;
  unit: string | null;
  gender: string | null;
  blood_type: string | null;
  phone: string | null;
  status: string;
  is_active: boolean | null;
  tenant_id: number;
}

export interface PersonnelAssignmentHistoryEntry {
  position: string | null;
  unit: string | null;
  start_date: string | null;
  end_date: string | null;
  is_primary: boolean;
}

export interface PersonnelFamilyMember {
  id: number;
  full_name: string;
  family_relation: string;
  membership_number: string;
  phone: string | null;
}

// Satu baris "keluar-masuk markas" (tab "Riwayat visitor" di detail personel).
export interface PersonnelVisitorLogEntry {
  id: number;
  purpose: string | null;
  entered_at: string | null;
  exited_at: string | null;
  status: string | null;
  vehicle_plate: string | null;
  vehicle_type: string | null;
}

// Satu baris peminjaman senjata (tab "Peminjaman Senjata" di detail personel).
export interface PersonnelWeaponLoanEntry {
  id: number;
  weapon_number: string | null;
  serial_number: string | null;
  purpose: string | null;
  loaned_at: string | null;
  returned_at: string | null;
  status: string | null;
}

export interface PersonnelDetail {
  id: number;
  service_number: string;
  full_name: string;
  rank: string | null;
  gender: string | null;
  birth_place: string | null;
  birth_date: string | null;
  birth_date_formatted: string | null;
  blood_type: string | null;
  address: string | null;
  phone: string | null;
  photo: string | null;
  status: string;
  is_active: boolean | null;
  tenant_id: number;
  current_assignment: { position: string | null; unit: string | null; start_date: string | null } | null;
  assignment_history: PersonnelAssignmentHistoryEntry[];
  family_members: PersonnelFamilyMember[];
  vehicles: unknown[];
  health_summary: { total_records: number; last_examined_at: string | null; last_result: string | null };
  // Status keberadaan terakhir personel (mis. "inside" / "outside") — ditampilkan di header detail.
  last_status_location: string | null;
  visitor_log_history: PersonnelVisitorLogEntry[];
  weapon_loan_history: PersonnelWeaponLoanEntry[];
}

// --- Persit (keluarga) ---

export interface PersitListItem {
  id: number;
  membership_number: string;
  full_name: string;
  family_relation: string;
  phone: string | null;
  spouse: { service_number: string; full_name: string; rank: string | null } | null;
  status: string;
  tenant_id: number;
}

export interface PersitDetail {
  id: number;
  membership_number: string;
  full_name: string;
  family_relation: string;
  phone: string | null;
  birth_place: string | null;
  birth_date: string | null;
  birth_date_formatted: string | null;
  blood_type: string | null;
  address: string | null;
  occupation: string | null;
  photo: string | null;
  status: string;
  tenant_id: number;
  spouse: { id: number; service_number: string; full_name: string; rank: string | null } | null;
  // Sama seperti pada PersonnelDetail — ditampilkan di header + tab "Riwayat visitor" detail Persit.
  last_status_location: string | null;
  visitor_log_history: PersonnelVisitorLogEntry[];
}

// --- Vehicles ---

export interface VehicleListItem {
  id: number;
  brand_model: string;
  plate_number: string;
  category: string | null;
  ownership_type: string | null;
  condition_status: string | null;
  photo: string | null;
  owner: { service_number: string; full_name: string } | null;
  is_active: boolean;
  tenant_id: number;
}

// Satu baris "log pos" kendaraan di detail Kendaraan — catatan keluar-masuk pos jaga kendaraan tsb.
// Bentuknya mirip `PersonnelVisitorLogEntry`, tapi berisi data pengemudi/penumpang, bukan data
// kendaraan (karena kendaraan-nya sendiri yang jadi subjek). Bentuk dikonfirmasi dari respons asli
// `GET /catalog/vehicles/{id}`.
export interface VehicleVisitorLogEntry {
  id: number;
  purpose: string | null;
  entered_at: string | null;
  exited_at: string | null;
  status: string | null;
  driver_passenger_name: string | null;
  driver_passenger_phone: string | null;
}

// Bentuk dikonfirmasi dari respons asli `GET /catalog/vehicles/{id}`.
export interface VehicleDetail {
  id: number;
  brand_model: string;
  plate_number: string;
  category: string | null;
  ownership_type: string | null;
  condition_status: string | null;
  engine_number?: string | null;
  frame_number?: string | null;
  stnk_expired_at?: string | null;
  notes?: string | null;
  photo: string | null;
  owner: {
    id?: number;
    service_number: string;
    full_name: string;
    rank?: string | null;
  } | null;
  is_active: boolean;
  tenant_id: number;
  // Log pos kendaraan terakhir (keluar-masuk pos jaga). Boleh kosong / tidak dikirim → empty state.
  visitor_log_history?: VehicleVisitorLogEntry[];
}

// --- Weapon categories ---

export interface WeaponCategoryListItem {
  id: number;
  name: string;
  code: string;
  weapon_type: string;
  caliber: string;
  description: string | null;
  is_active: boolean;
  tenant_id: number | null;
  total_weapons: number;
}

export interface WeaponCategoryWeaponEntry {
  id: number;
  weapon_number: string;
  serial_number: string;
  butt_number: string | null;
  ownership_type: string;
  condition_status: string;
  inventory_status: string;
  acquisition_date: string | null;
  current_unit: string | null;
  is_active: boolean;
}

export interface WeaponCategoryDetail extends WeaponCategoryListItem {
  weapons: WeaponCategoryWeaponEntry[];
}

// --- Weapon assignments ---

export interface WeaponAssignmentAssignee {
  type: string;
  id: number;
  service_number: string;
  full_name: string;
}

export interface WeaponAssignmentListItem {
  id: number;
  weapon_number: string;
  serial_number: string;
  category: string;
  assignment_type: string;
  assigned_at: string;
  returned_at: string | null;
  status: string;
  assigned_to: WeaponAssignmentAssignee;
  tenant_id: number;
}

export interface WeaponAssignmentDetail {
  id: number;
  assignment_type: string;
  assigned_at: string;
  returned_at: string | null;
  status: string;
  notes: string | null;
  tenant_id: number;
  weapon: {
    id: number;
    weapon_number: string;
    serial_number: string;
    category: string;
    caliber: string;
    condition_status: string;
    inventory_status: string;
  };
  assigned_to: WeaponAssignmentAssignee;
  created_by: { id: number; name: string } | null;
}
