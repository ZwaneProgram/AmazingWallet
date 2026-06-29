// designSystem.ts — the single source of truth for the "soft modern fintech" look.
//
// Two jobs:
//   1) Export plain tokens (RADII, SPACING, SHADOWS) that screens/primitives import.
//   2) Export a theme fragment (nbShadows, nbRadii, componentDefaults) merged into
//      native-base's `extendTheme` in AppContainer — so global props like
//      `shadow={2}` / rounded buttons / inputs restyle the WHOLE app at once,
//      without editing every screen by hand.

import { Platform } from "react-native";

// --- Raw tokens ---------------------------------------------------------------

// Corner radii. Soft fintech = generous, consistent rounding.
export const RADII = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

// Spacing rhythm (multiples of 4). Use for gaps/padding to keep vertical rhythm.
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Max content width — on web / large tablets the UI centers in a phone-like
// column instead of stretching edge-to-edge. Screens wrap content in <Screen>.
export const CONTENT_MAX_WIDTH = 520;

// Soft, diffuse, low-opacity shadows. React Native style objects, used directly
// via `style={SHADOWS.card}` where we want precise control.
export const SHADOWS = {
  // Resting card — barely-there lift.
  card: Platform.select({
    web: { boxShadow: "0px 10px 30px rgba(17, 24, 39, 0.06)" } as any,
    default: {
      shadowColor: "#0f172a",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 3,
    },
  }),
  // Small controls (pills / chips) — tight, even, subtle. A big card shadow on a
  // ~48px pill reads as a lopsided blob, so these get their own short-blur lift.
  pill: Platform.select({
    web: { boxShadow: "0px 2px 8px rgba(17, 24, 39, 0.10)" } as any,
    default: {
      shadowColor: "#0f172a",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3,
    },
  }),
  // Floating elements (FAB, sheets, hero).
  floating: Platform.select({
    web: { boxShadow: "0px 16px 40px rgba(17, 24, 39, 0.14)" } as any,
    default: {
      shadowColor: "#0f172a",
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.16,
      shadowRadius: 32,
      elevation: 8,
    },
  }),
} as const;

// --- native-base theme fragment ----------------------------------------------

// Override the numeric `shadow={n}` scale so every existing card softens for
// free. Keys are strings "1".."9" in native-base.
export const nbShadows = {
  "1": SHADOWS.card,
  "2": SHADOWS.card,
  "3": SHADOWS.floating,
  "4": SHADOWS.floating,
  "5": SHADOWS.floating,
} as const;

// Bump the named radii tokens (used by components that accept rounded="xl" etc.).
export const nbRadii = {
  lg: RADII.md,
  xl: RADII.lg,
  "2xl": RADII.xl,
  "3xl": 28,
} as const;

// Component default props — rounder buttons & inputs everywhere.
export const componentDefaults = {
  Button: {
    baseStyle: {
      rounded: "xl",
      _text: { fontFamily: "SourceBold" },
    },
    defaultProps: {
      rounded: "xl",
    },
  },
  Input: {
    baseStyle: {
      rounded: "lg",
    },
    defaultProps: {
      rounded: "lg",
      fontFamily: "SourceSansPro",
    },
  },
  Actionsheet: {},
} as const;
