export const colors = {
  // Latar dasar aplikasi — putih sedikit abu (kartu konten `surface` = #FFF di atasnya).
  background: '#F5F6F8',
  surface: '#FFFFFF',
  border: '#E4E9F2',
  text: '#0F172A',
  textMuted: '#64748B',
  primary: '#2563EB',
  primaryForeground: '#FFFFFF',
  danger: '#DC2626',
  dangerForeground: '#FFFFFF',
  success: '#16A34A',
  successSurface: '#DCFCE7',
  // Hijau sangat pucat — untuk latar kartu bertema hijau (mis. Kartu Anggota), lebih lembut
  // dari successSurface yang dipakai buat pill/badge.
  successSurfaceSubtle: '#F0FDF7',
  warning: '#F59E0B',
  warningSurface: '#FEF3C7',
  dangerSurface: '#FEE2E2',
  dangerMuted: '#FCA5A5',
  primarySurface: '#DBEAFE',
  neutralSurface: '#F1F5F9',
  // --- "Canvas theme" tokens (DESIGN_SYSTEM.md §1b) — near-white page ground, soft borders,
  // blue-tinted card shadow. Live on the Auth screens + Komandan/Home/Semua Peran groups.
  heading: '#1E293B',
  // Teks isi paragraf/butir yang lebih tegas dari `textMuted` tapi tidak sekelam `text`
  // (mis. butir catatan rilis di StatusModal). Slate-700.
  textBody: '#334155',
  placeholder: '#94A3B8',
  // Teks bantuan paling redup — mis. hint "pilih Lainnya untuk teks bebas" di bawah keterangan absen.
  textFaint: '#B8C0CC',
  borderSoft: '#E7EDF9',
  chipSurface: '#EEF3FD',
  // Pemisah "•" / garis tipis di atas latar gradient (DESIGN_SYSTEM §1b).
  dividerOnGradient: '#CBD5E1',
  // Latar "canvas" untuk SEMUA layar non-Auth — putih sedikit abu (revisi 2026-09-01, DESIGN_SYSTEM §1b).
  // Gradasi sangat halus; kartu konten tetap `surface` #FFF. Dulu lavender-biru (lihat `authGradient*`).
  pageGradientStart: '#F7F8FA',
  pageGradientMid: '#F4F6F9',
  pageGradientEnd: '#F2F4F7',
  // Latar Auth (Login/OTP/Lupa Password/Ganti Password) — TETAP gradient lavender-biru + siluet gunung.
  authGradientStart: '#EFF1FA',
  authGradientMid: '#E7ECF8',
  authGradientEnd: '#E2EAF6',
  gradientPrimaryStart: '#3B82F6',
  gradientPrimaryEnd: '#2563EB',
  // Danger CTA gradient (atoms/GradientButton tone="danger", StatusModal error icon + button).
  // Saturated red-500 → red-600 (`danger`), mirroring the primary's tight/vivid blue-500 → blue-600.
  // Deliberately NOT `dangerMuted` (#FCA5A5) / `gradientDangerStart` (#F87171) — both read washed-out
  // at CTA size. `gradientDangerStart` stays reserved for the softer status-tinted avatar gradients.
  gradientDangerCtaStart: '#EF4444',
  // Login-only decorative mountain silhouette (back → front).
  authMountainBack: '#CBD8EE',
  authMountainMid: '#B6C7E6',
  authMountainFront: '#9FB5DC',
  // Large translucent "blob" circles in the page corners.
  decorBlobStrong: 'rgba(255, 255, 255, 0.5)',
  decorBlobSoft: 'rgba(255, 255, 255, 0.35)',
  // Frosted track behind a segmented pill toggle sitting on the gradient backdrop.
  pillTrackSurface: 'rgba(255, 255, 255, 0.55)',
  pillTrackBorder: 'rgba(255, 255, 255, 0.8)',
  // Near-opaque white for overlay cards floating on a map (PersonnelMap legend).
  floatingSurface: 'rgba(255, 255, 255, 0.94)',
  // Home header (screens/Home/HomeHeader) — putih solid di atas latar near-white.
  headerSurface: '#FFFFFF',
  // Readable text on top of warningSurface (badge "Stale" / "Menunggu" / "Ditangani" / "Rusak Ringan").
  warningText: '#B45309',
  // Emphatic red heading on danger surfaces (Emergency banner title, alarm code card).
  dangerText: '#B91C1C',
  // "1 Emergency Terakhir" banner on CommanderHome — a soft red gradient wash, not the flat dangerSurface.
  alertBannerStart: '#FEECEC',
  alertBannerEnd: '#FDE0E0',
  alertBannerBorder: '#FBD5D5',
  // Muted map-canvas wash behind the loading placeholder for the personnel map preview.
  mapCanvasStart: '#E8F0E6',
  mapCanvasEnd: '#E3EDF7',
  // Nonactive personnel avatar gradient (list rows, DESIGN_SYSTEM §5.8).
  gradientInactiveStart: '#A78BFA',
  gradientInactiveEnd: '#8B5CF6',
  // Status-tinted avatar gradients (EmergencyList, PersonnelTracking) — paired with the matching
  // `danger` / `warning` / `success` end colour.
  gradientDangerStart: '#F87171',
  gradientWarnStart: '#FBBF6B',
  gradientSuccessStart: '#4ADE80',
  gradientEntryStart: '#F59E0B',
  gradientEntryEnd: '#EF4444',
  gradientWeaponStart: '#8B5CF6',
  gradientWeaponEnd: '#4F46E5',
  gradientHealthStart: '#10B981',
  gradientHealthEnd: '#0EA5E9',
  gradientPersonnelStart: '#3B82F6',
  gradientPersonnelEnd: '#2563EB',
  gradientFamilyStart: '#F472B6',
  gradientFamilyEnd: '#EC4899',
  overlay: 'rgba(15, 23, 42, 0.45)',
  // StatusModal (DESIGN_SYSTEM §5.15) — translucent accent ring ("halo") behind the 64px icon badge.
  haloPrimary: 'rgba(37, 99, 235, 0.10)',
  haloDanger: 'rgba(220, 38, 38, 0.10)',
  // Unread notification row (DESIGN_SYSTEM §5 list row / Notifications artboard) — a lighter
  // blue wash + border than `primarySurface`, which is reserved for chips/badges.
  notifUnreadSurface: '#EEF4FF',
  notifUnreadBorder: '#BFD3FB',
  // Sky-tinted chip (Buku Saku kategori "Operasional") — sits alongside the primary/warning/danger
  // chip washes for the other categories.
  skySurface: '#E0F2FE',
  skyText: '#0284C7',
  // Buku Saku detail — baris lampiran (latar sangat pucat kebiruan) + pill "Unduh"
  // (isian & garis biru transparan).
  attachmentRowSurface: '#F6F8FE',
  primaryTintSurface: 'rgba(37, 99, 235, 0.08)',
  primaryTintBorder: 'rgba(37, 99, 235, 0.16)',
} as const;
