// Status broadcast (FCM) sebuah aktivasi alarm stelling. String terbuka — backend bisa menambah
// nilai baru; client memetakan yang dikenal & fallback netral untuk sisanya.
export type StellingBroadcastStatus = 'sent' | 'pending' | 'failed' | (string & {});

// GET /stelling-alarms/current & GET /stelling-alarms/history
export interface StellingAlarmActivation {
  id: number;
  code: string;
  condition: string;
  audio_url: string | null;
  activated_at: string;
  broadcast_status: StellingBroadcastStatus;
}

// GET /stelling-alarms — daftar kode alarm yang tersedia (referensi + audio).
export interface StellingAlarmCode {
  id: number;
  code: string;
  name: string;
  condition: string;
  is_active: boolean;
  audio_url: string | null;
}
