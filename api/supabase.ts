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

// Guard: if the env keys are missing (e.g. a build where they weren't baked
// in), DON'T let createClient throw "supabaseUrl is required" — that aborts the
// whole app at startup with a hard native crash. Fall back to harmless
// placeholders so the app still mounts and can show an error instead of dying.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "[config] Missing SUPABASE_URL / SUPABASE_ANON_KEY. " +
      "Backend calls will fail — check your .env (local) or EAS environment variables (build)."
  );
}

export const supabase = createClient(
  SUPABASE_URL || "https://missing-config.supabase.co",
  SUPABASE_ANON_KEY || "missing-anon-key",
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
