// Nama role di `user.roles` yang menentukan POV Smart Academy.
// `academy_instructor` = versi Inggris dari "instruktur_akademik" (dikonfirmasi ke tim backend
// 2026-09-09). Ganti string ini kalau backend memakai nama lain.
export const ACADEMY_INSTRUCTOR_ROLE = 'academy_instructor';
export const COMMANDER_ROLE = 'komandan';

export type AcademyPovKind = 'member' | 'instructor' | 'commander';

export function academyPovFor(roles: string[] | null | undefined): AcademyPovKind {
  const list = roles ?? [];
  if (list.includes(COMMANDER_ROLE)) return 'commander';
  if (list.includes(ACADEMY_INSTRUCTOR_ROLE)) return 'instructor';
  return 'member';
}
