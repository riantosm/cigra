import { axiosInstance } from '@/services/api/axiosInstance';
import type { ApiResponse, DashboardSituation } from '@/types';

export interface DashboardSituationParams {
  unit_id?: number;
  date?: string;
}

export async function getDashboardSituationApi(
  params: DashboardSituationParams = {},
): Promise<DashboardSituation> {
  const { data } = await axiosInstance.get<ApiResponse<DashboardSituation>>('/dashboard/situation', {
    params,
  });
  return data.data;
}
