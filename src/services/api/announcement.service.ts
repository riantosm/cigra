import { axiosInstance } from '@/services/api/axiosInstance';
import type {
  Announcement,
  AnnouncementListResult,
  ApiResponse,
  CreateAnnouncementPayload,
  PaginationMeta,
} from '@/types';

export interface AnnouncementsParams {
  page?: number;
  per_page?: number;
  type?: 'alert' | 'announcement' | 'info';
  since?: string;
}

export async function getAnnouncementsApi(
  params: AnnouncementsParams = {},
): Promise<AnnouncementListResult> {
  const { data } = await axiosInstance.get<{
    success: boolean;
    data: Announcement[];
    meta?: PaginationMeta;
  }>('/announcements', { params });
  return { items: data.data, meta: data.meta ?? null };
}

export async function createAnnouncementApi(
  payload: CreateAnnouncementPayload,
): Promise<Announcement> {
  const { data } = await axiosInstance.post<ApiResponse<Announcement>>('/announcements', payload);
  return data.data;
}
