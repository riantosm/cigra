import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';

import type { FilePickResult } from '@/types';

// Wrapper pilih lampiran (dokumen/gambar) lewat @react-native-documents/picker.
// Mengembalikan `null` kalau user membatalkan; melempar Error berpesan Indonesia untuk file
// tak valid (tipe / ukuran). Butuh rebuild native (bukan reload JS) — autolink Android,
// `pod install` untuk iOS.

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];
const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

function extOf(name: string | null | undefined): string {
  if (!name) return '';
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export interface PickAttachmentOptions {
  // Batasi ke gambar saja (mis. scan surat lebih cocok pdf/gambar — tetap izinkan doc).
  allowDoc?: boolean;
}

export async function pickAttachment(options: PickAttachmentOptions = {}): Promise<FilePickResult | null> {
  const allowDoc = options.allowDoc ?? true;
  const wantedTypes = allowDoc
    ? [types.pdf, types.doc, types.docx, types.images]
    : [types.pdf, types.images];

  try {
    const [file] = await pick({ type: wantedTypes, mode: 'import', allowMultiSelection: false });
    if (!file?.uri) return null;

    const ext = extOf(file.name);
    const mime = (file.type ?? '').toLowerCase();
    const typeOk =
      ALLOWED_EXT.includes(ext) || ALLOWED_MIME.some(m => mime.includes(m.split('/')[1] ?? m));
    if (!typeOk) {
      throw new Error('Format file tidak didukung. Pilih PDF, DOC, DOCX, PNG, atau JPG.');
    }
    if (typeof file.size === 'number' && file.size > MAX_BYTES) {
      throw new Error('Ukuran file melebihi 10 MB. Pilih file yang lebih kecil.');
    }

    return {
      uri: file.uri,
      name: file.name ?? `lampiran.${ext || 'bin'}`,
      type: file.type ?? (ext === 'pdf' ? 'application/pdf' : 'application/octet-stream'),
      size: file.size ?? null,
    };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return null;
    if (error instanceof Error) throw error;
    throw new Error('Gagal membuka pemilih file. Coba lagi.');
  }
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
