// Edit Profil (POST /api/profile) — endpoint tunggal, semua field opsional. Dipakai terpisah
// oleh 3 form independen di layar EditProfile (foto / data pribadi / password), masing-masing
// mengirim hanya field yang relevan buat form itu sendiri.
export interface UpdateProfilePayload {
  full_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  birth_place?: string;
  birth_date?: string; // YYYY-MM-DD
  blood_type?: string;
  gender?: string; // 'male' | 'female'
  current_password?: string;
  password?: string;
  password_confirmation?: string;
}

export interface UpdateProfilePersonnel {
  id: number;
  full_name: string;
  service_number: string;
  rank: string;
  birth_place: string;
  birth_date: string;
  birth_date_formatted: string;
  blood_type: string;
  gender: string;
  address: string;
  phone: string;
  photo: string | null;
  status: string;
  position?: string;
  unit?: string;
  current_assignment?: { position?: string; unit?: string; start_date?: string } | null;
}

// Respons `data` — superset field akun, plus (kalau user punya personel) `personnel`.
export interface UpdateProfileResult {
  id: number;
  name: string;
  full_name?: string;
  email: string;
  username?: string;
  photo_url?: string | null;
  photo?: string | null;
  phone?: string;
  address?: string;
  birth_place?: string;
  birth_date?: string;
  birth_date_formatted?: string;
  blood_type?: string;
  gender?: string;
  personnel?: UpdateProfilePersonnel;
}
