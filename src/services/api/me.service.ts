import { axiosInstance } from '@/services/api/axiosInstance';
import type {
  ApiResponse,
  EmergencyContact,
  MeAssets,
  MeIdCard,
  MeMovement,
  MeStatus,
  PaginationMeta,
} from '@/types';

// Semua endpoint di sini berskup user yang login (dari Authorization: Bearer) — tidak perlu
// parameter NRP di path. Lihat documentation/API_CONTRACT_ANGGOTA.md.

export async function getMyIdCardApi(): Promise<MeIdCard> {
  const { data } = await axiosInstance.get<ApiResponse<MeIdCard>>('/me/id-card');
  return data.data;
}

export async function getMyStatusApi(): Promise<MeStatus> {
  const { data } = await axiosInstance.get<ApiResponse<MeStatus>>('/me/status');
  return data.data;
}

export async function getMyAssetsApi(): Promise<MeAssets> {
  const { data } = await axiosInstance.get<ApiResponse<MeAssets>>('/me/assets');
  return data.data;
}

export interface MyMovementsParams {
  page?: number;
  per_page?: number;
}

export interface MyMovementsResult {
  items: MeMovement[];
  meta: PaginationMeta | null;
}

export async function getMyMovementsApi(params: MyMovementsParams = {}): Promise<MyMovementsResult> {
  const { data } = await axiosInstance.get<{ success: boolean; data: MeMovement[]; meta?: PaginationMeta }>(
    '/me/movements',
    { params },
  );
  return { items: data.data, meta: data.meta ?? null };
}

export async function getEmergencyContactsApi(): Promise<EmergencyContact[]> {
  const { data } = await axiosInstance.get<ApiResponse<EmergencyContact[]>>('/emergency-contacts');
  return data.data;
}
