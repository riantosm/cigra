import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

import { healthAuthHeader, healthRecordAttachmentUrl } from '@/services/api/health.service';

// Unduh attachment pemeriksaan kesehatan (PDF/JPG/PNG) lewat endpoint terproteksi
// GET /health/records/{id}/attachment (butuh header Authorization). Dipakai di layar
// HealthRecordDetail — bisa dari petugas kesehatan maupun anggota (attachment miliknya sendiri);
// kewenangan ditegakkan backend (403 kalau bukan haknya).
//
// Android: pakai DownloadManager sistem — file mendarat di folder Downloads dengan notifikasi
// bawaan. iOS: cache file lalu buka document preview (share sheet) untuk simpan ke Files.

export type HealthAttachmentDownloadReason = 'not-found' | 'forbidden' | 'network';

export class HealthAttachmentError extends Error {
  reason: HealthAttachmentDownloadReason;
  constructor(reason: HealthAttachmentDownloadReason, message: string) {
    super(message);
    this.name = 'HealthAttachmentError';
    this.reason = reason;
  }
}

function extFromMime(mime: string | null | undefined): string {
  if (!mime) return '';
  if (mime.includes('pdf')) return '.pdf';
  if (mime.includes('png')) return '.png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  return '';
}

function guessExt(url: string, mime: string | null | undefined): string {
  const fromMime = extFromMime(mime);
  if (fromMime) return fromMime;
  const match = /\.(pdf|png|jpe?g)(?:\?|$)/i.exec(url);
  return match ? `.${match[1].toLowerCase().replace('jpeg', 'jpg')}` : '';
}

export interface DownloadResult {
  // Path/URI file hasil unduhan (untuk pesan sukses).
  path: string;
  // true kalau Android DownloadManager yang menaruh ke folder Downloads publik.
  toDownloads: boolean;
}

export async function downloadHealthAttachment(
  recordId: number | string,
  fileBaseName: string,
): Promise<DownloadResult> {
  const url = healthRecordAttachmentUrl(recordId);
  const headers = await healthAuthHeader();
  const safeBase = fileBaseName.replace(/[^\w.-]+/g, '_').slice(0, 80) || `pemeriksaan-${recordId}`;

  if (Platform.OS === 'android') {
    const res = await ReactNativeBlobUtil.config({
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        title: safeBase,
        description: 'Attachment pemeriksaan kesehatan',
        mediaScannable: true,
        path: `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${safeBase}-${Date.now()}`,
      },
    }).fetch('GET', url, headers);
    const status = res.info().status;
    assertOkStatus(status);
    // DownloadManager sudah menambah ekstensi sesuai mime; path final ada di res.path().
    return { path: res.path(), toDownloads: true };
  }

  const res = await ReactNativeBlobUtil.config({
    fileCache: true,
    appendExt: guessExt(url, null).replace('.', '') || undefined,
  }).fetch('GET', url, headers);
  const status = res.info().status;
  assertOkStatus(status);
  const path = res.path();
  await ReactNativeBlobUtil.ios.previewDocument(path);
  return { path, toDownloads: false };
}

function assertOkStatus(status: number): void {
  if (status === 404) {
    throw new HealthAttachmentError('not-found', 'Attachment tidak ditemukan untuk pemeriksaan ini.');
  }
  if (status === 401 || status === 403) {
    throw new HealthAttachmentError('forbidden', 'Anda tidak berhak mengunduh attachment ini.');
  }
  if (status < 200 || status >= 300) {
    throw new HealthAttachmentError('network', 'Gagal mengunduh attachment. Coba lagi.');
  }
}
