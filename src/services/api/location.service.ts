import { axiosInstance } from '@/services/api/axiosInstance';
import type {
  ApiResponse,
  LocationsOverviewFilters,
  LocationStatus,
  MyLocationResult,
  PaginationMeta,
  PersonnelLocationOverviewItem,
  SendLocationPayload,
} from '@/types';

export async function sendLocationApi(payload: SendLocationPayload): Promise<unknown> {
  const { data } = await axiosInstance.post<ApiResponse<unknown>>('/locations', payload);
  return data.data;
}

export async function getMyLocationApi(): Promise<MyLocationResult> {
  const { data } = await axiosInstance.get<ApiResponse<MyLocationResult>>('/locations/me');
  return data.data;
}

export interface LocationsOverviewParams {
  page?: number;
  per_page?: number;
  status?: LocationStatus;
  unit_id?: number;
}

export interface LocationsOverviewResult {
  items: PersonnelLocationOverviewItem[];
  meta: PaginationMeta;
  filters: LocationsOverviewFilters;
}

export async function getLocationsOverviewApi(params: LocationsOverviewParams = {}): Promise<LocationsOverviewResult> {
  const { data } = await axiosInstance.get<{
    success: boolean;
    data: PersonnelLocationOverviewItem[];
    meta: PaginationMeta;
    filters: LocationsOverviewFilters;
  }>('/locations/overview', { params });
  return { items: data.data, meta: data.meta, filters: data.filters };
}
