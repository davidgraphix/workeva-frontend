// Builds the app with the public placeholder configuration the local E2E suite expects.
// NEXT_PUBLIC_* values are inlined at build time, so the E2E build is separate from a
// real deployment build.
import { spawnSync } from "node:child_process";

const env = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:54399",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54399",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-placeholder-anon-key",
};

const result = spawnSync("npx", ["next", "build"], { stdio: "inherit", env, shell: true });
process.exit(result.status ?? 1);
