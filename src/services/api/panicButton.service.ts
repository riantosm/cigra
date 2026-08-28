import { axiosInstance } from '@/services/api/axiosInstance';
import type { ApiResponse, PanicButtonPayload, PanicButtonResult } from '@/types';

export async function sendPanicButtonApi(payload: PanicButtonPayload): Promise<PanicButtonResult> {
  const { data } = await axiosInstance.post<ApiResponse<PanicButtonResult>>('/panic-buttons', payload);
  return data.data;
}
