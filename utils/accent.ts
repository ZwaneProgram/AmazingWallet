// Accent-color theming. The app's accent (historically purple #7e22ce) is now
// user-customizable. From a single chosen hex we derive a full 50–900 shade ramp
// so it can stand in for native-base's `purple` palette app-wide, and expose the
// same ramp to code that uses raw hex (gradients, icon colors, etc).

export const DEFAULT_ACCENT = "#7e22ce"; // = COLORS.PURPLE[700]

export interface AccentRamp {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  let h = (hex || "").replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(h || "7e22ce", 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

export const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) =>
  "#" +
  [r, g, b]
    .map((v) => clampByte(v).toString(16).padStart(2, "0"))
    .join("");

// Linear mix of an rgb color toward a single target value (255 = white, 0 = black).
const mixToward = (c: { r: number; g: number; b: number }, target: number, amt: number) => ({
  r: c.r + (target - c.r) * amt,
  g: c.g + (target - c.g) * amt,
  b: c.b + (target - c.b) * amt,
});

// Builds a tint/shade ramp anchored so the chosen color IS the 700 shade (the most
// heavily used token across the app), lighter tints below, darker shades above.
export const buildAccentRamp = (hex: string): AccentRamp => {
  const base = hexToRgb(hex);
  const lighten = (amt: number) => rgbToHex(mixToward(base, 255, amt));
  const darken = (amt: number) => rgbToHex(mixToward(base, 0, amt));
  return {
    50: lighten(0.95),
    100: lighten(0.88),
    200: lighten(0.74),
    300: lighten(0.58),
    400: lighten(0.42),
    500: lighten(0.26),
    600: lighten(0.12),
    700: rgbToHex(base),
    800: darken(0.16),
    900: darken(0.32),
  };
};

// ---- HSV helpers for the color picker UI ----------------------------------

export interface HSV {
  h: number; // 0..360
  s: number; // 0..1
  v: number; // 0..1
}

export const hexToHsv = (hex: string): HSV => {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
};

export const hsvToHex = ({ h, s, v }: HSV): string => {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex({ r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 });
};

// True if a string is a valid 3- or 6-digit hex color (with or without leading #).
export const isValidHex = (value: string): boolean =>
  /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test((value || "").trim());

export const normalizeHex = (value: string): string => {
  let h = (value || "").trim();
  if (!h.startsWith("#")) h = "#" + h;
  return h.toLowerCase();
};
