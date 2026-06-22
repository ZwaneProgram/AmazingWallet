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

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExposeSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const supabaseConfig = Constants.manifest?.extra?.supabase;
