import { axiosInstance } from '@/services/api/axiosInstance';
import type { ApiResponse, AuthUser, LoginPayload, LoginResult } from '@/types';

export async function loginApi(payload: LoginPayload): Promise<LoginResult> {
  const { data } = await axiosInstance.post<ApiResponse<LoginResult>>('/auth/login', payload);
  return data.data;
}

export async function logoutApi(): Promise<void> {
  await axiosInstance.post('/auth/logout');
}

export async function getMeApi(): Promise<AuthUser> {
  const { data } = await axiosInstance.get<ApiResponse<AuthUser>>('/auth/me');
  return data.data;
}
