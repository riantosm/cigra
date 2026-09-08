import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

import { dispositionAuthHeader, resolveSecureFileUrl } from '@/services/api/disposition.service';

// Unduh berkas terproteksi `/api/secure-files/...` (butuh header Authorization) untuk fitur
// Disposisi Surat — "Lihat Berkas Surat" & lampiran tindak lanjut.
// Android: DownloadManager → folder Downloads + notifikasi. iOS: cache lalu document preview.

export type SecureFileDownloadReason = 'not-found' | 'forbidden' | 'network';

export class SecureFileDownloadError extends Error {
  reason: SecureFileDownloadReason;
  constructor(reason: SecureFileDownloadReason, message: string) {
    super(message);
    this.name = 'SecureFileDownloadError';
    this.reason = reason;
  }
}

function guessExt(url: string): string {
  const match = /\.(pdf|png|jpe?g|docx?|xlsx?)(?:\?|$)/i.exec(url);
  return match ? match[1].toLowerCase().replace('jpeg', 'jpg') : 'pdf';
}

function assertOkStatus(status: number): void {
  if (status === 404) {
    throw new SecureFileDownloadError('not-found', 'Berkas tidak ditemukan.');
  }
  if (status === 401 || status === 403) {
    throw new SecureFileDownloadError('forbidden', 'Anda tidak berhak mengunduh berkas ini.');
  }
  if (status < 200 || status >= 300) {
    throw new SecureFileDownloadError('network', 'Gagal mengunduh berkas. Coba lagi.');
  }
}

export interface SecureFileDownloadResult {
  path: string;
  toDownloads: boolean;
}

export async function downloadSecureFile(
  rawUrl: string,
  fileBaseName: string,
): Promise<SecureFileDownloadResult> {
  const url = resolveSecureFileUrl(rawUrl);
  const headers = await dispositionAuthHeader();
  const ext = guessExt(url);
  const safeBase = (fileBaseName.replace(/[^\w.-]+/g, '_').slice(0, 80) || 'berkas') + `-${Date.now()}`;

  if (Platform.OS === 'android') {
    const res = await ReactNativeBlobUtil.config({
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        title: fileBaseName,
        description: 'Berkas disposisi surat',
        mediaScannable: true,
        path: `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${safeBase}.${ext}`,
      },
    }).fetch('GET', url, headers);
    assertOkStatus(res.info().status);
    return { path: res.path(), toDownloads: true };
  }

  const res = await ReactNativeBlobUtil.config({ fileCache: true, appendExt: ext }).fetch(
    'GET',
    url,
    headers,
  );
  assertOkStatus(res.info().status);
  const path = res.path();
  await ReactNativeBlobUtil.ios.previewDocument(path);
  return { path, toDownloads: false };
}
