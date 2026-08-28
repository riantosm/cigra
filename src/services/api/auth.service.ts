import { axiosInstance } from '@/services/api/axiosInstance';
import type { LoginPayload, LoginResponse } from '@/types';

// Backend belum tersedia — authSlice saat ini memakai mock login (admin/admin).
// Ganti pemanggilnya ke fungsi ini begitu endpoint auth sudah siap.
export async function loginApi(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await axiosInstance.post<LoginResponse>('/auth/login', payload);
  return data;
}
