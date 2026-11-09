import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    // Build output and test artefacts. playwright-report/ and test-results/ are gitignored but
    // were not lint-ignored, so `npm run lint` reported dozens of warnings from Playwright's own
    // bundled trace viewer after any browser run - noise that buries the real findings.
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
    ],
  },
];

export default config;
