// QR Kartu Anggota di-render dari layanan generator gambar (bukan lagi di-encode di device),
// supaya logo satuan bisa disematkan di tengah kode.
//
// TODO: `QR_EMBED_IMAGE_URL` masih memakai tunnel ngrok dev — ganti ke URL logo produksi yang
// permanen sebelum rilis.
const QR_GENERATE_ENDPOINT = 'https://qr.sakaraguna.com/generate';
const QR_EMBED_IMAGE_URL = 'https://smart-battalion.sakaraguna.com/assets/images/logo-icon.png';

// `text` = NRP anggota (service_number). image_url dibiarkan tanpa encoding agar sesuai format
// yang diharapkan layanan.
export function buildIdentityQrUrl(text: string): string {
  return `${QR_GENERATE_ENDPOINT}?text=${encodeURIComponent(text)}&image_url=${QR_EMBED_IMAGE_URL}`;
}
