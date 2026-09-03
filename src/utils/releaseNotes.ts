// Parser catatan rilis (`release_notes` dari GET /app-version) — backend mengirim satu string
// biasa berformat changelog app (`documentation/CHANGELOG.md`): baris judul opsional, lalu
// bagian "Baru" / "Ditingkatkan" / "Perbaikan" dengan butir diawali "- ". Dipakai StatusModal
// (lewat AppVersionGate) supaya bisa dirender rata-kiri + heading + bullet, bukan satu blok
// teks rata-tengah.

export type ReleaseNoteBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'text'; text: string };

// Kata pembuka bagian yang dikenal (persis, tanpa memandang huruf besar/kecil).
const KNOWN_HEADINGS = new Set(['baru', 'ditingkatkan', 'perbaikan', 'diperbaiki', 'catatan']);

// Awalan penanda butir: "- ", "– ", "— ", "* ", "• ".
const BULLET_PREFIX = /^\s*[-–—*•]\s+/;

export function parseReleaseNotes(raw: string | null | undefined): ReleaseNoteBlock[] {
  if (!raw) return [];
  const lines = raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.trim());

  const blocks: ReleaseNoteBlock[] = [];
  lines.forEach((line, index) => {
    if (!line) return; // baris kosong hanya pemisah — jarak diatur lewat gap saat render.

    if (BULLET_PREFIX.test(line)) {
      blocks.push({ kind: 'bullet', text: line.replace(BULLET_PREFIX, '').trim() });
      return;
    }

    // Heading: kata bagian yang dikenal, atau baris pendek non-butir yang langsung diikuti butir.
    const nextLine = lines[index + 1] ?? '';
    const looksLikeHeading =
      KNOWN_HEADINGS.has(line.toLowerCase()) ||
      (line.length <= 32 && !line.endsWith('.') && BULLET_PREFIX.test(nextLine));
    blocks.push({ kind: looksLikeHeading ? 'heading' : 'text', text: line });
  });

  return blocks;
}
