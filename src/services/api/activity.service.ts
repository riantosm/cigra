import { axiosInstance } from '@/services/api/axiosInstance';
import type { ActivityMovement, ActivityMovementsResult, PaginationMeta } from '@/types';

export interface ActivityMovementsParams {
  unit_id?: number;
  page?: number;
  per_page?: number;
  direction?: 'in' | 'out';
}

export async function getActivityMovementsApi(
  params: ActivityMovementsParams = {},
): Promise<ActivityMovementsResult> {
  const { data } = await axiosInstance.get<{
    success: boolean;
    data: ActivityMovement[];
    meta?: PaginationMeta;
  }>('/activities/movements', { params });
  return { items: data.data, meta: data.meta ?? null };
}
