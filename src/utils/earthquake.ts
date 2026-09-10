import { colors } from '@/theme/colors';

export interface EarthquakeMeta {
  accent: string;
  surface: string;
  border: string;
  label: string;
  badgeVariant: 'success' | 'warning' | 'danger';
}

// Warna & label berdasar magnitudo (dan potensi tsunami). Tsunami selalu "Bahaya".
export function earthquakeMeta(magnitude: number, isTsunami = false): EarthquakeMeta {
  if (isTsunami) {
    return {
      accent: colors.danger,
      surface: colors.dangerSurface,
      border: colors.dangerBorderSoft,
      label: 'Potensi Tsunami',
      badgeVariant: 'danger',
    };
  }
  if (magnitude >= 6) {
    return {
      accent: colors.danger,
      surface: colors.dangerSurface,
      border: colors.dangerBorderSoft,
      label: 'Kuat',
      badgeVariant: 'danger',
    };
  }
  if (magnitude >= 5) {
    return {
      accent: colors.warning,
      surface: colors.warningSurface,
      border: colors.alertBannerBorder,
      label: 'Sedang',
      badgeVariant: 'warning',
    };
  }
  return {
    accent: colors.success,
    surface: colors.successSurface,
    border: colors.borderSoft,
    label: 'Ringan',
    badgeVariant: 'success',
  };
}

export function formatMagnitude(magnitude: number): string {
  return `M ${magnitude.toFixed(1)}`;
}
