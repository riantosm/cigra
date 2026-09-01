import { axiosInstance } from '@/services/api/axiosInstance';
import type { ApiResponse, AppVersionInfo } from '@/types';

// `GET /app-version` — publik, tanpa query, tanpa `Authorization` wajib (interceptor axios tetap
// menyisipkan Bearer token kalau kebetulan ada — backend mengabaikannya untuk endpoint ini).
// Response memuat blok `android` + `ios`; pemilihan blok & perbandingan versi dilakukan di client.
export async function getAppVersionApi(): Promise<AppVersionInfo> {
  const { data } = await axiosInstance.get<ApiResponse<AppVersionInfo>>('/app-version');
  return data.data;
}
