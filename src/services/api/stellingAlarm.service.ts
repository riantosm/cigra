import { axiosInstance } from '@/services/api/axiosInstance';
import type { ApiResponse, StellingAlarmActivation, StellingAlarmCode } from '@/types';

// Aktivasi alarm stelling terbaru di satuan — `null` kalau belum pernah ada aktivasi.
export async function getCurrentStellingAlarmApi(): Promise<StellingAlarmActivation | null> {
  const { data } = await axiosInstance.get<ApiResponse<StellingAlarmActivation | null>>(
    '/stelling-alarms/current',
  );
  return data.data;
}

// Seluruh kode alarm stelling aktif beserta warna + referensi audio.
export async function getStellingAlarmsApi(): Promise<StellingAlarmCode[]> {
  const { data } = await axiosInstance.get<ApiResponse<StellingAlarmCode[]>>('/stelling-alarms');
  return data.data;
}

// Riwayat aktivasi (maksimal 20 record, terbaru ke terlama).
export async function getStellingAlarmHistoryApi(): Promise<StellingAlarmActivation[]> {
  const { data } = await axiosInstance.get<ApiResponse<StellingAlarmActivation[]>>(
    '/stelling-alarms/history',
  );
  return data.data;
}

// Aktifkan / siarkan sebuah kode stelling ke satuan (memicu broadcast FCM + membuat record
// aktivasi baru). `{alarm}` = id kode dari `getStellingAlarmsApi`. Khusus role komandan (backend
// menegakkan). Tanpa body.
export async function activateStellingAlarmApi(
  alarmId: number,
): Promise<StellingAlarmActivation> {
  const { data } = await axiosInstance.post<ApiResponse<StellingAlarmActivation>>(
    `/stelling-alarms/${alarmId}/activate`,
  );
  return data.data;
}
