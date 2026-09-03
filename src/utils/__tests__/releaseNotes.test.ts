import { parseReleaseNotes } from '@/utils/releaseNotes';

describe('parseReleaseNotes', () => {
  it('returns [] for empty / nullish input', () => {
    expect(parseReleaseNotes('')).toEqual([]);
    expect(parseReleaseNotes(null)).toEqual([]);
    expect(parseReleaseNotes(undefined)).toEqual([]);
  });

  it('parses the changelog-style payload from GET /app-version', () => {
    const raw =
      'SmartBattalion v0.4.0 — 2 September 2026\r\n\r\n' +
      'Baru\r\n' +
      '- Kekuatan Apel: buat sesi apel & rekap kehadiran.\r\n' +
      '- Bottom sheet detail "Aset Saya" di Home anggota.\r\n\r\n' +
      'Ditingkatkan\r\n' +
      '- Viewer kontrak API dirombak.\r\n' +
      '- Bentuk data kendaraan pada /me/assets dirapikan.';

    expect(parseReleaseNotes(raw)).toEqual([
      { kind: 'text', text: 'SmartBattalion v0.4.0 — 2 September 2026' },
      { kind: 'heading', text: 'Baru' },
      { kind: 'bullet', text: 'Kekuatan Apel: buat sesi apel & rekap kehadiran.' },
      { kind: 'bullet', text: 'Bottom sheet detail "Aset Saya" di Home anggota.' },
      { kind: 'heading', text: 'Ditingkatkan' },
      { kind: 'bullet', text: 'Viewer kontrak API dirombak.' },
      { kind: 'bullet', text: 'Bentuk data kendaraan pada /me/assets dirapikan.' },
    ]);
  });

  it('treats an unknown short line followed by a bullet as a heading', () => {
    expect(parseReleaseNotes('Catatan Khusus\n- sesuatu')).toEqual([
      { kind: 'heading', text: 'Catatan Khusus' },
      { kind: 'bullet', text: 'sesuatu' },
    ]);
  });

  it('keeps plain prose as text blocks', () => {
    expect(parseReleaseNotes('Perbaikan kecil dan peningkatan stabilitas secara umum.')).toEqual([
      { kind: 'text', text: 'Perbaikan kecil dan peningkatan stabilitas secara umum.' },
    ]);
  });
});
