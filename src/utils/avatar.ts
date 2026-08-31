import Config from 'react-native-config';

// Foto personel/persit/kendaraan disajikan lewat endpoint terproteksi
// `<API_BASE_URL tanpa suffix /api>/api/secure-files/<path>` (butuh `Authorization: Bearer <token>`
// — lihat komponen `SecureImage`). Field `photo` dari API bisa datang dalam beberapa bentuk: URL
// absolut, "/api/secure-files/xxx", "secure-files/xxx", atau hanya "xxx" — semuanya dinormalkan ke
// bentuk di atas. Contoh: path API `/api/secure-files/personnel/photos/abc.jpg` dengan
// `API_BASE_URL=https://smart-battalion.sakaraguna.com/api` menjadi
// `https://smart-battalion.sakaraguna.com/api/secure-files/personnel/photos/abc.jpg`.
export function resolveSecureFileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const siteBase = (Config.API_BASE_URL ?? '').replace(/\/+$/, '').replace(/\/api$/i, '');
  const trimmed = path.replace(/^\/+/, '');
  const markerIndex = trimmed.toLowerCase().indexOf('secure-files/');
  const relative = markerIndex >= 0 ? trimmed.slice(markerIndex + 'secure-files/'.length) : trimmed;
  return `${siteBase}/api/secure-files/${relative}`;
}

// Hanya URL di bawah host API kita sendiri yang butuh header `Authorization` — jangan tempelkan token
// ke host pihak ketiga. Dibandingkan terhadap host tanpa suffix `/api`, karena `resolveSecureFileUrl`
// sekarang membangun URL dari host tersebut (bukan dari base yang masih menyertakan `/api`).
export function isProtectedApiUrl(uri: string): boolean {
  const siteBase = (Config.API_BASE_URL ?? '').replace(/\/+$/, '').replace(/\/api$/i, '');
  return siteBase.length > 0 && uri.startsWith(siteBase);
}

// Backend mengisi field `photo` dengan avatar placeholder untuk personel yang belum punya foto
// asli — dulu berupa URL `ui-avatars.com`, sekarang berupa data-URI **SVG** inline
// (`data:image/svg+xml;base64,...` berisi 1 huruf inisial). Dua-duanya tidak bisa di-decode
// `<Image>` RN (Fresco menolak SVG) — perlakukan sebagai "tidak ada foto" supaya komponen memakai
// fallback inisial / GradientAvatar-nya sendiri (offline, konsisten). Foto asli (path
// `/api/secure-files/...` atau URL gambar raster) tetap dimuat normal.
export function isDisplayablePhoto(path: string | null | undefined): boolean {
  if (!path || !path.trim()) return false;
  if (/^data:image\/svg\+xml/i.test(path)) return false;
  return !/\bui-avatars\.com\//i.test(path);
}
