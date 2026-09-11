import { axiosInstance } from '@/services/api/axiosInstance';
import type { ApiResponse, FilePickResult, UpdateProfilePayload, UpdateProfileResult } from '@/types';

// POST /profile → update data personel/akun, ganti foto (multipart bila `photo` diisi), dan/atau
// ganti password (current_password + password + password_confirmation) — satu endpoint, semua
// field opsional. Field kosong/undefined tidak dikirim, supaya form yang cuma mengubah satu hal
// (mis. cuma foto) tidak ikut mengosongkan field lain di backend.
export async function updateProfileApi(
  payload: UpdateProfilePayload,
  photo?: FilePickResult | null,
): Promise<UpdateProfileResult> {
  const fields: Record<string, string> = {};
  (Object.keys(payload) as (keyof UpdateProfilePayload)[]).forEach(key => {
    const value = payload[key];
    if (value != null && value !== '') fields[key] = String(value);
  });

  if (!photo) {
    const { data } = await axiosInstance.post<ApiResponse<UpdateProfileResult>>('/profile', fields);
    return data.data;
  }

  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));
  form.append('photo', photo as unknown as Blob);
  const { data } = await axiosInstance.post<ApiResponse<UpdateProfileResult>>('/profile', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}
