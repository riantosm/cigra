import { axiosInstance } from '@/services/api/axiosInstance';
import type {
  ApiResponse,
  PaginationMeta,
  PanicButtonDetail,
  PanicButtonListFilters,
  PanicButtonListItem,
  PanicButtonListResult,
  PanicButtonPayload,
  PanicButtonResult,
  UpdatePanicButtonPayload,
} from '@/types';

export async function sendPanicButtonApi(payload: PanicButtonPayload): Promise<PanicButtonResult> {
  const { data } = await axiosInstance.post<ApiResponse<PanicButtonResult>>('/panic-buttons', payload);
  return data.data;
}

export interface PanicButtonsParams {
  page?: number;
  per_page?: number;
  status?: 'active' | 'acknowledged' | 'resolved';
  unit_id?: number;
  from?: string;
  to?: string;
}

export async function getPanicButtonsApi(
  params: PanicButtonsParams = {},
): Promise<PanicButtonListResult> {
  const { data } = await axiosInstance.get<{
    success: boolean;
    data: PanicButtonListItem[];
    meta?: PaginationMeta;
    filters?: PanicButtonListFilters;
  }>('/panic-buttons', { params });
  return { items: data.data, meta: data.meta ?? null, filters: data.filters ?? null };
}

export async function getPanicButtonApi(id: number | string): Promise<PanicButtonDetail> {
  const { data } = await axiosInstance.get<ApiResponse<PanicButtonDetail>>(`/panic-buttons/${id}`);
  return data.data;
}

export async function updatePanicButtonApi(
  id: number | string,
  payload: UpdatePanicButtonPayload,
): Promise<PanicButtonDetail> {
  const { data } = await axiosInstance.patch<ApiResponse<PanicButtonDetail>>(
    `/panic-buttons/${id}`,
    payload,
  );
  return data.data;
}
