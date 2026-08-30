import Config from 'react-native-config';

// Foto personel/persit/kendaraan disajikan lewat endpoint terproteksi `<API_BASE_URL>/secure-files/<path>`
// (butuh `Authorization: Bearer <token>` — lihat komponen `SecureImage`). Field `photo` dari API bisa
// datang dalam beberapa bentuk: URL absolut, "/admin/secure-files/xxx", "secure-files/xxx", atau hanya
// "xxx" — semuanya dinormalkan ke `<API_BASE_URL>/secure-files/<sisa>`.
export function resolveSecureFileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const apiBase = (Config.API_BASE_URL ?? '').replace(/\/+$/, ''); // sudah termasuk suffix /api
  const trimmed = path.replace(/^\/+/, '');
  const markerIndex = trimmed.toLowerCase().indexOf('secure-files/');
  const relative = markerIndex >= 0 ? trimmed.slice(markerIndex + 'secure-files/'.length) : trimmed;
  return `${apiBase}/secure-files/${relative}`;
}

// Hanya URL di bawah API kita sendiri yang butuh header `Authorization` — jangan tempelkan token ke
// host pihak ketiga.
export function isProtectedApiUrl(uri: string): boolean {
  const apiBase = (Config.API_BASE_URL ?? '').replace(/\/+$/, '');
  return apiBase.length > 0 && uri.startsWith(apiBase);
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

// Placeholder avatar berbasis inisial (ui-avatars.com). Dipakai list katalog sebagai penanda
// "resource ini punya kolom avatar" — `isDisplayablePhoto` menyaringnya jadi tidak pernah benar-benar
// di-request; komponen list menampilkan fallback inisial buatannya sendiri.
export function initialsAvatarUrl(fullName: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=3a7ca5&color=fff`;
}
