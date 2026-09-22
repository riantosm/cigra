import { colors } from '@/theme/colors';

// "Aksen Gradient" (DESIGN_SYSTEM.md §5.13b) — deriving the 2-tone gradient pair for an icon chip
// from the single flat colour a call site already has (e.g. a status→colour lookup array), so
// existing per-item colour maps don't need to be rewritten as gradient pairs by hand. Every pair
// here reuses an existing gradient token from theme/colors.ts — never a new colour.
const GRADIENT_BY_FLAT_COLOR: Record<string, readonly [string, string]> = {
  [colors.primary]: [colors.gradientPersonnelStart, colors.gradientPersonnelEnd],
  [colors.success]: [colors.gradientSuccessStart, colors.success],
  [colors.warning]: [colors.gradientWarnStart, colors.warning],
  [colors.warningText]: [colors.gradientWarnStart, colors.warning],
  [colors.danger]: [colors.gradientDangerStart, colors.danger],
};

// Unknown flat colour: fall back to a flat "gradient" (both stops the same colour) rather than
// throwing, so a call site with an uncommon colour still renders instead of crashing.
export function gradientForColor(color: string): readonly [string, string] {
  return GRADIENT_BY_FLAT_COLOR[color] ?? [color, color];
}
