import { axiosInstance } from '@/services/api/axiosInstance';
import type { ApiResponse, MyLocationResult, SendLocationPayload } from '@/types';

export async function sendLocationApi(payload: SendLocationPayload): Promise<unknown> {
  const { data } = await axiosInstance.post<ApiResponse<unknown>>('/locations', payload);
  return data.data;
}

export async function getMyLocationApi(): Promise<MyLocationResult> {
  const { data } = await axiosInstance.get<ApiResponse<MyLocationResult>>('/locations/me');
  return data.data;
}
