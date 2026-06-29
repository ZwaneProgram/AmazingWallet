import { extendTheme, NativeBaseProvider, theme as nbTheme } from "native-base";
import React from "react";
import { useSelector } from "react-redux";
import Navigation from "../navigation/Navigation";
import { RootState } from "../redux/store";
import { buildAccentRamp, DEFAULT_ACCENT } from "../utils/accent";
import { nbShadows, nbRadii, componentDefaults } from "../theme/designSystem";

// --- native-base ↔ modern React Native compatibility shim ---------------------
// native-base 3.x hardcodes web-only CSS values (e.g. outlineWidth: "0" / "2px")
// deep inside many component themes. On React Native 0.76+, outlineWidth and
// outlineOffset became REAL native style props that must be numbers, so those
// strings crash the app with: "String cannot be cast to java.lang.Double".
// We can't edit node_modules, so we recursively coerce those props to numbers
// across every native-base component theme, once, here.
const NUMERIC_OUTLINE_PROPS = new Set(["outlineWidth", "outlineOffset"]);

function sanitizeStyles(value: any): any {
  if (Array.isArray(value)) {
    return value.map(sanitizeStyles);
  }
  if (value && typeof value === "object") {
    const out: any = {};
    for (const key of Object.keys(value)) {
      const v = value[key];
      if (NUMERIC_OUTLINE_PROPS.has(key) && typeof v === "string") {
        const n = parseFloat(v);
        out[key] = Number.isFinite(n) ? n : 0;
      } else {
        out[key] = sanitizeStyles(v);
      }
    }
    return out;
  }
  return value;
}

// Wrap a theme style source (object or (props) => object) so its output is sanitized.
const wrapStyleSource = (src: any) =>
  typeof src === "function" ? (...args: any[]) => sanitizeStyles(src(...args)) : sanitizeStyles(src);

const sanitizedComponents = Object.keys(nbTheme.components || {}).reduce((acc: any, name) => {
  const comp: any = (nbTheme.components as any)[name];
  if (!comp || typeof comp !== "object") {
    return acc;
  }
  const fixed: any = { ...comp };
  if (comp.baseStyle) {
    fixed.baseStyle = wrapStyleSource(comp.baseStyle);
  }
  if (comp.variants) {
    fixed.variants = Object.keys(comp.variants).reduce((v: any, k) => {
      v[k] = wrapStyleSource(comp.variants[k]);
      return v;
    }, {});
  }
  if (comp.sizes) {
    fixed.sizes = Object.keys(comp.sizes).reduce((s: any, k) => {
      s[k] = wrapStyleSource(comp.sizes[k]);
      return s;
    }, {});
  }
  acc[name] = fixed;
  return acc;
}, {});

const AppContainer: React.FC<any> = () => {
  const user = useSelector((state: RootState) => state.user);

  const isDarkTheme = user.theme === "dark";

  // The user's accent replaces the built-in purple palette, so every `purple.*`
  // token across the app recolors live. Falls back to the original purple for
  // accounts persisted before this setting existed.
  const accentRamp = buildAccentRamp(user.accentColor || DEFAULT_ACCENT);

  // Layer our "soft modern fintech" defaults (rounder buttons/inputs) on top of
  // the sanitized native-base component themes, so the whole app restyles at once.
  const mergedComponents: any = { ...sanitizedComponents };
  for (const name of Object.keys(componentDefaults)) {
    mergedComponents[name] = {
      ...(sanitizedComponents[name] || {}),
      ...(componentDefaults as any)[name],
    };
  }

  const theme = extendTheme({
    shadows: nbShadows,
    radii: nbRadii,
    colors: {
      purple: accentRamp,
      primary: accentRamp,
      muted: {
        // 50 stays a surface color (dark card bg in dark mode); header text uses an
        // explicit white instead. The text shades (400–900) flip to light in dark mode
        // so secondary text stays readable, while light-mode values are unchanged.
        50: isDarkTheme ? "#374151" : "#fafafa",
        400: isDarkTheme ? "#d1d5db" : "#a3a3a3",
        500: isDarkTheme ? "#e5e7eb" : "#737373",
        600: isDarkTheme ? "#eef2f7" : "#525252",
        700: isDarkTheme ? "#f3f4f6" : "#404040",
        800: isDarkTheme ? "#f9fafb" : "#262626",
        900: isDarkTheme ? "#fafafa" : "#171717",
      },
    },
    components: mergedComponents,
    config: {
      initialColorMode: user.theme,
    },
  });

  return (
    <NativeBaseProvider theme={theme}>
      <Navigation />
    </NativeBaseProvider>
  );
};

export default AppContainer;
