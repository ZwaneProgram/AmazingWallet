import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@env";
import Constants from "expo-constants";

// The URL polyfill is required on native (React Native lacks a complete URL
// implementation) but crashes on web, where the browser already provides URL.
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("react-native-url-polyfill/auto");
}

// Supabase needs a storage engine for the auth session. SecureStore only
// exists on native; on web we fall back to the browser's localStorage.
const ExposeSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === "web") {
      return Promise.resolve((globalThis as any).localStorage?.getItem(key) ?? null);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === "web") {
      (globalThis as any).localStorage?.setItem(key, value);
      return;
    }
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === "web") {
      (globalThis as any).localStorage?.removeItem(key);
      return;
    }
    SecureStore.deleteItemAsync(key);
  },
};

// Resolve the Supabase config. `@env` (react-native-dotenv) proved unreliable
// on native/EAS builds (it failed to inline the values, crashing the app with
// "supabaseUrl is required"). The robust source is Expo's `extra`, populated
// from env vars in app.config.js at config time — works in Expo Go AND EAS.
// We keep `@env` as a fallback for safety.
const extra: any =
  (Constants.expoConfig as any)?.extra ?? (Constants as any).manifest?.extra ?? {};

const resolvedUrl: string | undefined = extra.supabaseUrl || SUPABASE_URL;
const resolvedAnonKey: string | undefined = extra.supabaseAnonKey || SUPABASE_ANON_KEY;

// Guard: never let createClient throw at startup (that aborts the whole app
// with a hard native crash). Fall back to harmless placeholders + log instead.
if (!resolvedUrl || !resolvedAnonKey) {
  console.error(
    "[config] Missing Supabase URL / anon key. Backend calls will fail — " +
      "check your .env (local) or EAS environment variables (build)."
  );
}

export const supabase = createClient(
  resolvedUrl || "https://missing-config.supabase.co",
  resolvedAnonKey || "missing-anon-key",
  {
    auth: {
      storage: ExposeSecureStoreAdapter as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export const supabaseConfig = Constants.manifest?.extra?.supabase;
