import type { ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';

// Shadow presets for the "canvas theme" (DESIGN_SYSTEM.md §1c). Shadows here are ALWAYS
// blue-tinted (`primary`) or the component's accent colour — never pure black, except `overlay`.
// Import these instead of inlining shadow props per component.

export const cardShadow: ViewStyle = {
  shadowColor: colors.primary,
  shadowOpacity: 0.06,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

// Slightly stronger — for the one dominant card on a screen (detail header, current-alarm card).
export const cardShadowRaised: ViewStyle = {
  shadowColor: colors.primary,
  shadowOpacity: 0.08,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

// Primary pill CTA glow (gradient button). Pair with an opaque backgroundColor so iOS has a
// shape to cast from behind an SVG fill.
export const ctaPrimaryShadow: ViewStyle = {
  shadowColor: colors.primary,
  shadowOpacity: 0.3,
  shadowRadius: 30,
  shadowOffset: { width: 0, height: 14 },
  elevation: 8,
};

export const ctaDangerShadow: ViewStyle = {
  shadowColor: colors.danger,
  shadowOpacity: 0.3,
  shadowRadius: 30,
  shadowOffset: { width: 0, height: 14 },
  elevation: 8,
};

// Small square button / search field (back button, filter button).
export const smallButtonShadow: ViewStyle = {
  shadowColor: colors.primary,
  shadowOpacity: 0.1,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

// Home header (screens/Home/HomeHeader) — a soft NEUTRAL drop shadow (not blue-tinted) so the
// solid-white bar reads as a calm surface separator on the near-white page ground.
export const headerShadow: ViewStyle = {
  shadowColor: colors.text,
  shadowOpacity: 0.05,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

// Bottom tab bar — upward blue glow.
export const tabBarShadow: ViewStyle = {
  shadowColor: colors.primary,
  shadowOpacity: 0.12,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: -6 },
  elevation: 8,
};
