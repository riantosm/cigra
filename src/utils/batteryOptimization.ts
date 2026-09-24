import { batteryOptimization } from '@/native/batteryOptimization';

// `true` berarti app SUDAH dikecualikan dari battery optimization (baik) — nama method Android
// asli agak membingungkan (`isIgnoringBatteryOptimizations` = tidak dibatasi baterai).
export async function isIgnoringBatteryOptimizations(): Promise<boolean> {
  return batteryOptimization.isIgnoringBatteryOptimizations();
}

// Membuka dialog sistem untuk meminta pengecualian battery optimization langsung untuk app ini —
// supaya notifikasi darurat (data-only FCM) tetap bisa membangunkan app walau di-background lama
// atau OS sedang deep sleep. Lihat baris "Optimisasi Baterai" di layar Settings.
export async function requestIgnoreBatteryOptimizations(): Promise<void> {
  await batteryOptimization.requestIgnoreBatteryOptimizations();
}
