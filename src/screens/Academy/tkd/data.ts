// Data DUMMY untuk alur Academy › Akademik › TKD (Tes Kompetensi Dasar). Belum ada backend —
// semua di sini statik. 5 soal contoh (2 TWK, 2 TIU, 1 TKP); teks sebagian diambil dari artboard
// "Academy — Akademik" agar cocok dengan mockup. Ganti ke service API begitu endpoint-nya ada.

export type TkdSubtest = 'TWK' | 'TIU' | 'TKP';
export type TkdOptionKey = 'A' | 'B' | 'C' | 'D' | 'E';

export interface TkdOption {
  key: TkdOptionKey;
  text: string;
  /** TKP: nilai 1–5 tiap opsi. TWK/TIU: tidak dipakai. */
  value?: number;
}

export interface TkdQuestion {
  id: string;
  subtest: TkdSubtest;
  prompt: string;
  options: TkdOption[];
  /** TWK/TIU: kunci jawaban. TKP: null (skor dari `option.value`). */
  answerKey: TkdOptionKey | null;
  explanation: string;
  tip?: string;
}

export interface TkdSubtestConfig {
  subtest: TkdSubtest;
  /** "TWK — Wawasan Kebangsaan" */
  label: string;
  /** "Tes Wawasan Kebangsaan" */
  description: string;
  /** Ambang batas skor untuk lulus subkategori ini. */
  threshold: number;
}

export interface TkdModule {
  id: string;
  title: string; // "Modul 1"
  fullTitle: string; // "TKD Modul 1"
  category: string; // "Kedinasan"
  durationSeconds: number;
  locked?: boolean;
  questions: TkdQuestion[];
}

export const TKD_SUBTESTS: Record<TkdSubtest, TkdSubtestConfig> = {
  TWK: {
    subtest: 'TWK',
    label: 'TWK — Wawasan Kebangsaan',
    description: 'Tes Wawasan Kebangsaan',
    threshold: 12,
  },
  TIU: {
    subtest: 'TIU',
    label: 'TIU — Intelegensi Umum',
    description: 'Tes Intelegensi Umum',
    threshold: 12,
  },
  TKP: {
    subtest: 'TKP',
    label: 'TKP — Karakteristik Pribadi',
    description: 'Tes Karakteristik Pribadi',
    threshold: 7,
  },
};

/** Poin per jawaban benar untuk TWK/TIU (skala SKD). */
const CORRECT_POINTS = 5;

const QUESTIONS: TkdQuestion[] = [
  {
    id: 'q1',
    subtest: 'TWK',
    prompt:
      'Sikap positif terhadap nilai-nilai Pancasila, khususnya sila keempat, dapat ditunjukkan melalui…',
    options: [
      { key: 'A', text: 'Memaksakan kehendak kepada peserta musyawarah yang lain' },
      {
        key: 'B',
        text: 'Mengutamakan musyawarah untuk mencapai mufakat dalam mengambil keputusan bersama',
      },
      { key: 'C', text: 'Menerima keputusan hanya jika sesuai dengan kepentingan pribadi' },
      { key: 'D', text: 'Menghindari keterlibatan dalam pengambilan keputusan bersama' },
      { key: 'E', text: 'Menyerahkan seluruh keputusan kepada pemimpin tanpa berpendapat' },
    ],
    answerKey: 'B',
    explanation:
      'Sila keempat, "Kerakyatan yang dipimpin oleh hikmat kebijaksanaan dalam permusyawaratan/perwakilan", menekankan musyawarah untuk mufakat. Mengutamakan musyawarah dalam mengambil keputusan bersama adalah pengamalan langsung sila ini.',
  },
  {
    id: 'q2',
    subtest: 'TWK',
    prompt:
      'Lagu kebangsaan "Indonesia Raya" pertama kali diperdengarkan pada Kongres Pemuda II tahun 1928. Siapa penciptanya?',
    options: [
      { key: 'A', text: 'Wage Rudolf Supratman' },
      { key: 'B', text: 'Ismail Marzuki' },
      { key: 'C', text: 'Cornel Simanjuntak' },
      { key: 'D', text: 'Kusbini' },
      { key: 'E', text: 'Ibu Sud (Saridjah Niung)' },
    ],
    answerKey: 'A',
    explanation:
      '"Indonesia Raya" diciptakan oleh W.R. Supratman dan pertama kali dikumandangkan pada penutupan Kongres Pemuda II, 28 Oktober 1928, di Batavia.',
  },
  {
    id: 'q3',
    subtest: 'TIU',
    prompt: 'Suatu deret bilangan: 3, 4, 7, 11, 18, 29, … Bilangan berikutnya adalah…',
    options: [
      { key: 'A', text: '40' },
      { key: 'B', text: '45' },
      { key: 'C', text: '47' },
      { key: 'D', text: '48' },
      { key: 'E', text: '52' },
    ],
    answerKey: 'C',
    explanation:
      'Deret ini adalah penjumlahan dua suku sebelumnya (pola Fibonacci): 3+4=7, 4+7=11, 7+11=18, 11+18=29. Maka suku berikutnya = 18+29 = 47.',
    tip: 'Saat selisih antar suku tidak konstan, cek apakah tiap suku = jumlah dua suku sebelumnya sebelum mencoba pola kuadrat.',
  },
  {
    id: 'q4',
    subtest: 'TIU',
    prompt:
      'Semua taruna mengikuti apel pagi. Sebagian peserta apel pagi bertugas jaga malam. Kesimpulan yang PASTI benar adalah…',
    options: [
      { key: 'A', text: 'Semua taruna bertugas jaga malam' },
      { key: 'B', text: 'Sebagian taruna bertugas jaga malam' },
      { key: 'C', text: 'Tidak ada taruna yang bertugas jaga malam' },
      { key: 'D', text: 'Semua yang bertugas jaga malam adalah taruna' },
      { key: 'E', text: 'Tidak ada kesimpulan yang dapat ditarik' },
    ],
    answerKey: 'B',
    explanation:
      'Karena semua taruna = peserta apel pagi, dan sebagian peserta apel pagi jaga malam, maka minimal sebagian taruna bisa termasuk yang jaga malam — namun yang pasti hanya "sebagian taruna bertugas jaga malam". Pilihan lain terlalu kuat atau tidak didukung premis.',
  },
  {
    id: 'q5',
    subtest: 'TKP',
    prompt:
      'Rekan satu regu meminta Anda menutupi keterlambatannya saat apel pagi kepada komandan. Sikap Anda…',
    options: [
      { key: 'A', text: 'Menutupinya, karena solidaritas regu lebih utama', value: 2 },
      { key: 'B', text: 'Diam saja dan berharap tidak ada yang bertanya', value: 1 },
      {
        key: 'C',
        text: 'Menyarankan rekan melapor sendiri dan menjelaskan alasannya secara jujur',
        value: 5,
      },
      { key: 'D', text: 'Menutupinya kali ini, tetapi menegur rekan setelahnya', value: 3 },
      { key: 'E', text: 'Melaporkan rekan langsung ke komandan tanpa memberitahunya', value: 4 },
    ],
    answerKey: null,
    explanation:
      'Pada TKP tidak ada jawaban "salah" — setiap opsi bernilai 1–5. Nilai tertinggi ada pada sikap yang menjunjung kejujuran sekaligus tetap suportif: mendorong rekan bertanggung jawab dan melapor sendiri secara terbuka.',
  },
  {
    id: 'q6',
    subtest: 'TWK',
    prompt: 'Semboyan "Bhinneka Tunggal Ika" dikutip dari kitab karya Mpu Tantular berjudul…',
    options: [
      { key: 'A', text: 'Negarakertagama' },
      { key: 'B', text: 'Sutasoma' },
      { key: 'C', text: 'Arjunawiwaha' },
      { key: 'D', text: 'Pararaton' },
      { key: 'E', text: 'Smaradahana' },
    ],
    answerKey: 'B',
    explanation:
      'Frasa "Bhinneka Tunggal Ika tan hana dharma mangrwa" terdapat dalam Kakawin Sutasoma karya Mpu Tantular pada masa Majapahit. Negarakertagama ditulis Mpu Prapanca.',
  },
  {
    id: 'q7',
    subtest: 'TWK',
    prompt:
      'Lembaga negara yang berwenang menguji undang-undang terhadap UUD 1945 adalah…',
    options: [
      { key: 'A', text: 'Mahkamah Agung' },
      { key: 'B', text: 'Mahkamah Konstitusi' },
      { key: 'C', text: 'Majelis Permusyawaratan Rakyat' },
      { key: 'D', text: 'Dewan Perwakilan Rakyat' },
      { key: 'E', text: 'Komisi Yudisial' },
    ],
    answerKey: 'B',
    explanation:
      'Sesuai Pasal 24C UUD 1945, Mahkamah Konstitusi berwenang menguji UU terhadap UUD (judicial review). Mahkamah Agung menguji peraturan di bawah UU terhadap UU.',
  },
  {
    id: 'q8',
    subtest: 'TIU',
    prompt: 'Antonim (lawan kata) yang paling tepat dari kata "PROGRESIF" adalah…',
    options: [
      { key: 'A', text: 'Agresif' },
      { key: 'B', text: 'Regresif' },
      { key: 'C', text: 'Ofensif' },
      { key: 'D', text: 'Masif' },
      { key: 'E', text: 'Persuasif' },
    ],
    answerKey: 'B',
    explanation:
      '"Progresif" berarti bergerak maju / ke arah kemajuan. Lawannya adalah "regresif" yang berarti mundur atau menurun. Kata-kata lain hanya mirip bunyi, bukan lawan makna.',
  },
  {
    id: 'q9',
    subtest: 'TIU',
    prompt:
      'Tiga orang pekerja menyelesaikan sebuah pekerjaan dalam 8 hari. Jika ada 4 pekerja dengan kecepatan sama, pekerjaan selesai dalam…',
    options: [
      { key: 'A', text: '5 hari' },
      { key: 'B', text: '6 hari' },
      { key: 'C', text: '8 hari' },
      { key: 'D', text: '10 hari' },
      { key: 'E', text: '11 hari' },
    ],
    answerKey: 'B',
    explanation:
      'Total beban kerja = 3 × 8 = 24 "hari-pekerja". Dengan 4 pekerja: 24 ÷ 4 = 6 hari. Jumlah pekerja dan lama waktu berbanding terbalik.',
    tip: 'Untuk soal "pekerja × hari", hitung dulu total hari-pekerja (konstan), lalu bagi dengan jumlah pekerja baru.',
  },
  {
    id: 'q10',
    subtest: 'TKP',
    prompt:
      'Anda ditunjuk memimpin sebuah kegiatan yang belum pernah Anda tangani sebelumnya. Sikap Anda…',
    options: [
      { key: 'A', text: 'Menolak penunjukan karena takut gagal', value: 1 },
      {
        key: 'B',
        text: 'Menerima, lalu segera mempelajari tugasnya dan meminta arahan dari yang berpengalaman',
        value: 5,
      },
      { key: 'C', text: 'Menerima tetapi menunda memulai sampai keadaan mendesak', value: 2 },
      { key: 'D', text: 'Menerima dan menyerahkan sebagian besar tugas kepada anggota lain', value: 3 },
      { key: 'E', text: 'Menerima dan mengerjakan sebisanya tanpa bertanya kepada siapa pun', value: 4 },
    ],
    answerKey: null,
    explanation:
      'Sikap terbaik menunjukkan inisiatif dan kemauan belajar: menerima tanggung jawab, cepat mempelajari, dan tidak sungkan meminta arahan. Menolak tugas atau menunda menandakan rendahnya inisiatif.',
  },
];

// Soal dikelompokkan per subkategori (TWK → TIU → TKP) supaya penomoran di grid Navigasi Soal
// berurutan. Sort JS stabil (Hermes), jadi urutan dalam tiap subkategori tetap sesuai QUESTIONS.
const SUBTEST_ORDER: TkdSubtest[] = ['TWK', 'TIU', 'TKP'];
const ORDERED_QUESTIONS = [...QUESTIONS].sort(
  (a, b) => SUBTEST_ORDER.indexOf(a.subtest) - SUBTEST_ORDER.indexOf(b.subtest),
);

export const TKD_MODULES: TkdModule[] = [
  {
    id: 'tkd-modul-1',
    title: 'Modul 1',
    fullTitle: 'TKD Modul 1',
    category: 'Kedinasan',
    durationSeconds: 15 * 60,
    questions: ORDERED_QUESTIONS,
  },
  {
    id: 'tkd-modul-2',
    title: 'Modul 2',
    fullTitle: 'TKD Modul 2',
    category: 'Kedinasan',
    durationSeconds: 15 * 60,
    locked: true,
    questions: [],
  },
];

export function getTkdModule(moduleId: string): TkdModule | undefined {
  return TKD_MODULES.find(m => m.id === moduleId);
}

export function subtestsInOrder(module: TkdModule): TkdSubtest[] {
  const seen: TkdSubtest[] = [];
  for (const q of module.questions) {
    if (!seen.includes(q.subtest)) seen.push(q.subtest);
  }
  return seen;
}

// --- Skoring -------------------------------------------------------------------

export interface TkdSubtestResult {
  subtest: TkdSubtest;
  config: TkdSubtestConfig;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
  score: number;
  maxScore: number;
  passed: boolean;
}

export interface TkdResult {
  moduleId: string;
  totalScore: number;
  maxScore: number;
  correct: number;
  wrong: number;
  blank: number;
  elapsedSeconds: number;
  passed: boolean;
  subtests: TkdSubtestResult[];
}

function maxForQuestion(q: TkdQuestion): number {
  if (q.subtest === 'TKP') {
    return Math.max(...q.options.map(o => o.value ?? 0));
  }
  return CORRECT_POINTS;
}

export function scoreQuestion(q: TkdQuestion, answer: string | undefined): number {
  if (!answer) return 0;
  if (q.subtest === 'TKP') {
    return q.options.find(o => o.key === answer)?.value ?? 0;
  }
  return answer === q.answerKey ? CORRECT_POINTS : 0;
}

export function scoreTkd(
  module: TkdModule,
  answers: Record<string, string>,
  elapsedSeconds: number,
): TkdResult {
  const bySubtest = new Map<TkdSubtest, TkdSubtestResult>();

  for (const q of module.questions) {
    const cfg = TKD_SUBTESTS[q.subtest];
    let bucket = bySubtest.get(q.subtest);
    if (!bucket) {
      bucket = {
        subtest: q.subtest,
        config: cfg,
        total: 0,
        correct: 0,
        wrong: 0,
        blank: 0,
        score: 0,
        maxScore: 0,
        passed: false,
      };
      bySubtest.set(q.subtest, bucket);
    }
    const answer = answers[q.id];
    bucket.total += 1;
    bucket.maxScore += maxForQuestion(q);
    bucket.score += scoreQuestion(q, answer);
    if (!answer) {
      bucket.blank += 1;
    } else if (q.subtest === 'TKP') {
      bucket.correct += 1; // TKP: terjawab dihitung "correct" untuk ringkasan benar/salah
    } else if (answer === q.answerKey) {
      bucket.correct += 1;
    } else {
      bucket.wrong += 1;
    }
  }

  const subtests = subtestsInOrder(module)
    .map(s => bySubtest.get(s))
    .filter((b): b is TkdSubtestResult => Boolean(b));

  for (const b of subtests) {
    b.passed = b.score >= b.config.threshold;
  }

  const result: TkdResult = {
    moduleId: module.id,
    totalScore: subtests.reduce((a, b) => a + b.score, 0),
    maxScore: subtests.reduce((a, b) => a + b.maxScore, 0),
    correct: subtests.reduce((a, b) => a + b.correct, 0),
    wrong: subtests.reduce((a, b) => a + b.wrong, 0),
    blank: subtests.reduce((a, b) => a + b.blank, 0),
    elapsedSeconds,
    passed: subtests.length > 0 && subtests.every(b => b.passed),
    subtests,
  };
  return result;
}

/** "01:38:24" bila ≥ 1 jam, selain itu "38:24". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
