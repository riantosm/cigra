import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

import { htmlPrint } from '@/native/htmlPrint';
import { coopAbsoluteUrl, coopAuthHeader, getCoopPrintHtmlApi } from '@/services/api/coopSalary.service';
import type { CoopExportFormat } from '@/types';

// Ekspor Tagihan Koperasi (`.../export/excel|pdf`).
// - excel: berkas .xlsx biner → Android: DownloadManager ke folder Unduhan + notifikasi;
//   iOS: react-native-blob-util ke cache lalu document preview (bagikan/simpan dari sana).
// - pdf: backend mengirim HALAMAN HTML cetak (`<body onload="window.print()">`, style inline, tanpa
//   aset eksternal), BUKAN PDF biner. Diambil lewat axios (ikut refresh-token), lalu Android:
//   native `HtmlPrintModule` (WebView tak terlihat → PrintManager) membuka dialog cetak sistem dengan
//   opsi "Simpan sebagai PDF". iOS: disimpan .html lalu document preview.
//   (Membuka .html lewat intent VIEW tidak andal — muncul pemilih aplikasi acak, dan HTML Viewer
//   bawaan tidak menjalankan window.print().)
//   Catatan: jangan unduh halaman ini dengan react-native-blob-util `fetch` — Cloudflare mengirimnya
//   ter-gzip tanpa Content-Length dan blob-util gagal dengan "Download interrupted.".

export class CoopExportError extends Error {}

function assertOk(status: number): void {
  if (status === 401 || status === 403) {
    throw new CoopExportError('Anda tidak berhak mengekspor data ini.');
  }
  if (status === 404) throw new CoopExportError('Data tagihan tidak ditemukan.');
  if (status < 200 || status >= 300) throw new CoopExportError('Gagal mengekspor. Coba lagi.');
}

export interface CoopExportResult {
  // true → tersimpan di folder Unduhan (Android excel). false → dibuka di aplikasi lain/preview.
  savedToDownloads: boolean;
}

// `path` = path API relatif (tanpa `/api`), mis. `/coop-salary-report/me/9/export/pdf`.
export async function exportCoopFile(
  path: string,
  format: CoopExportFormat,
  fileBaseName: string,
): Promise<CoopExportResult> {
  const safeBase = fileBaseName.replace(/[^\w.-]+/g, '_').slice(0, 80) || 'tagihan-koperasi';

  if (format === 'pdf') {
    const html = await getCoopPrintHtmlApi(path);
    if (htmlPrint) {
      // Rekap satuan dikirim `@page { size: A4 landscape }`, rincian anggota `A4 portrait`.
      const landscape = /@page[^}]*size\s*:[^;}]*landscape/i.test(html);
      await htmlPrint.printHtml(html, safeBase, landscape);
      return { savedToDownloads: false };
    }
    // iOS / build Android lama tanpa HtmlPrintModule: simpan .html lalu buka pratinjau / aplikasi lain.
    const filePath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${safeBase}-${Date.now()}.html`;
    await ReactNativeBlobUtil.fs.writeFile(filePath, html, 'utf8');
    if (Platform.OS === 'android') {
      // Tanpa chooserTitle: blob-util membungkus intent dengan createChooser TANPA
      // FLAG_ACTIVITY_NEW_TASK kalau judul diisi → "startActivity() from outside of an Activity".
      await ReactNativeBlobUtil.android.actionViewIntent(filePath, 'text/html');
    } else {
      await ReactNativeBlobUtil.ios.previewDocument(filePath);
    }
    return { savedToDownloads: false };
  }

  const url = coopAbsoluteUrl(path);
  // `identity` → minta respons tanpa gzip supaya panjang data cocok dengan Content-Length.
  const headers = { ...(await coopAuthHeader()), 'Accept-Encoding': 'identity' };

  if (Platform.OS === 'android') {
    const res = await ReactNativeBlobUtil.config({
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        // Android 10+: `storeInDownloads` → folder Download PUBLIK (nama file = `title`; nama kembar
        // otomatis diberi akhiran oleh DownloadManager). `fs.dirs.DownloadDir` justru folder privat
        // app (Android/data/<pkg>/files/Download) yang tak terlihat di aplikasi File.
        title: `${safeBase}.xlsx`,
        description: 'Tagihan koperasi',
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        mediaScannable: true,
        storeInDownloads: true,
        path: `${ReactNativeBlobUtil.fs.dirs.LegacyDownloadDir}/${safeBase}.xlsx`,
      },
    }).fetch('GET', url, headers);
    assertOk(res.info().status);
    return { savedToDownloads: true };
  }

  const res = await ReactNativeBlobUtil.config({ fileCache: true, appendExt: 'xlsx' }).fetch('GET', url, headers);
  assertOk(res.info().status);
  await ReactNativeBlobUtil.ios.previewDocument(res.path());
  return { savedToDownloads: false };
}
