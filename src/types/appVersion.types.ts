// Kontrak `GET /app-version` — lihat documentation/API_CONTRACT.md §1.
// Backend cukup mengumumkan versi terbaru + minimum per platform; SEMUA perbandingan versi
// dilakukan di client (semantic-version compare, bukan string compare).

export interface AppVersionPlatformInfo {
  latest_version: string;
  latest_build: number | null;
  min_supported_version: string;
  download_url: string | null;
  store_url: string | null;
  release_notes: string | null;
  released_at: string | null;
}

export interface AppVersionInfo {
  android: AppVersionPlatformInfo;
  ios: AppVersionPlatformInfo;
}

// Hasil evaluasi versi terpasang vs blok platform:
// - `none`      → terpasang >= latest_version (atau versi tidak dikenal / lebih baru)
// - `suggested` → min_supported_version <= terpasang < latest_version
// - `required`  → terpasang < min_supported_version
export type AppUpdateStatus = 'none' | 'suggested' | 'required';
