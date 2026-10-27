import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/unit/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    // A suite that finds no files must fail, not report success. vitest 4.1.12 stopped
    // matching this glob on Windows and still exited 0, which would have turned the CI test
    // step green while running nothing - hence the exact pin in package.json.
    //
    // That pin keeps two moderate @vitest/mocker advisories (GHSA-qxg6-89mg-rqv8,
    // GHSA-xp26-3454-mjgp) open. They need an attacker able to reach a running vitest dev
    // server, they are dev-only, and nothing they touch ships: `npm audit --omit=dev` reports
    // zero. A release gate that silently runs no tests is the worse risk of the two. Revisit
    // when a vitest release both fixes the advisories and discovers these files.
    passWithNoTests: false,
    env: {
      NEXT_PUBLIC_API_BASE_URL: "https://api.test",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.test",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    },
  },
});
