// Extends app.json. Expo loads .env into process.env when evaluating this
// config, and on EAS the build's environment variables are in process.env too.
// We surface the backend config under `extra` so the app can read it reliably
// via expo-constants (Constants.expoConfig.extra) — this replaced the flaky
// @env/react-native-dotenv injection that was crashing native builds.
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    freecurrencyApiKey: process.env.FREECURRENCY_API_KEY,
  },
});
