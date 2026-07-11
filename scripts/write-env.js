// Runs on EAS during `eas-build-pre-install`. Recreates the .env file that
// `@env` (react-native-dotenv) reads at bundle time, using the EAS
// environment variables you set with `eas env:create`. This keeps the real
// keys OUT of the git repo while still making them available to the build.
//
// Locally this is a no-op: your existing .env is already present, and if the
// EAS vars aren't set it won't clobber it.
const fs = require("fs");

const vars = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  FREECURRENCY_API_KEY: process.env.FREECURRENCY_API_KEY,
  HASH_WARNING: process.env.HASH_WARNING ?? "false",
};

// Only write if we actually received the values from the EAS environment.
if (vars.SUPABASE_URL && vars.SUPABASE_ANON_KEY) {
  const body =
    Object.entries(vars)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") + "\n";
  fs.writeFileSync(".env", body);
  console.log("write-env: wrote .env from EAS environment variables");
} else {
  console.log("write-env: SUPABASE_* not in env — leaving existing .env untouched");
}
