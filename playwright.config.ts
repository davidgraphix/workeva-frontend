import { defineConfig, devices } from "@playwright/test";

/**
 * Three tiers. Build first with `npm run e2e:build`.
 *
 *  public  - signed-out journey against the local build: route protection, accessibility,
 *            keyboard and mobile layout.
 *
 *  ui      - signed-in screens against the local build and e2e/mock-backend.mjs, a fixture
 *            stand-in for Supabase Auth and the API: layout, mobile behaviour, accessibility
 *            and UI state handling. It proves nothing about security.
 *
 *  staging - the golden flow against a real staging deployment. Requires E2E_BASE_URL and
 *            pre-verified test accounts (see e2e/staging/README.md). Skipped otherwise.
 *
 * Mobile projects emulate viewport, touch and user agent in Chromium. They are not real
 * iOS Safari or Android Chrome, and physical-device testing is still required.
 */
const stagingBaseUrl = process.env.E2E_BASE_URL;
const localPort = 3100;
const mockPort = 54399;

export default defineConfig({
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    ...(["desktop", "android", "iphone"] as const).map((form) => ({
      name: `ui-${form}`,
      testDir: "e2e/ui",
      use: {
        ...(form === "desktop" ? devices["Desktop Chrome"] : form === "android" ? devices["Pixel 7"] : { ...devices["iPhone 14"], browserName: "chromium" as const }),
        baseURL: `http://localhost:${localPort}`,
      },
    })),
    {
      name: "public-desktop",
      testDir: "e2e/public",
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${localPort}` },
    },
    {
      name: "public-android",
      testDir: "e2e/public",
      use: { ...devices["Pixel 7"], baseURL: `http://localhost:${localPort}` },
    },
    {
      name: "public-iphone",
      testDir: "e2e/public",
      use: { ...devices["iPhone 14"], browserName: "chromium", baseURL: `http://localhost:${localPort}` },
    },
    {
      name: "staging-desktop",
      testDir: "e2e/staging",
      use: { ...devices["Desktop Chrome"], baseURL: stagingBaseUrl },
    },
    {
      name: "staging-android",
      testDir: "e2e/staging",
      grep: /@mobile/,
      use: { ...devices["Pixel 7"], baseURL: stagingBaseUrl },
    },
  ],
  webServer: stagingBaseUrl
    ? undefined
    : [
        {
          command: "node e2e/mock-backend.mjs",
          port: mockPort,
          reuseExistingServer: !process.env.CI,
        },
        {
          command: `npx next start -p ${localPort}`,
          port: localPort,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
});
