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

// Backend mengisi field `photo` dengan URL placeholder ui-avatars.com untuk personel yang belum
// punya foto asli. Layanan itu sering kena rate-limit (list personel = puluhan request sekaligus)
// dan saat itu membalas **SVG** ~560 byte, bukan PNG — `<Image>` RN (Fresco) tidak bisa men-decode
// SVG sehingga gambar gagal ("unknown image format"). Perlakukan URL ui-avatars sebagai "tidak ada
// foto" supaya komponen langsung memakai fallback inisialnya sendiri (offline, konsisten, tanpa
// request yang gampang gagal). Foto asli tetap dimuat normal.
export function isDisplayablePhoto(path: string | null | undefined): boolean {
  if (!path || !path.trim()) return false;
  return !/\bui-avatars\.com\//i.test(path);
}
