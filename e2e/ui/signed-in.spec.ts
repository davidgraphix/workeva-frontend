import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * Signed-in screens in a real browser at desktop, Android-sized and iPhone-sized viewports,
 * backed by e2e/mock-backend.mjs. These check what a person sees and can do - layout,
 * overflow, accessibility, the clock-in flow and its failure states - not security.
 */

const LOCAL_ORIGIN = "http://localhost:3100";
const OFFICE = { latitude: 6.4281, longitude: 3.4219 };

/** Writes a Supabase-shaped session cookie, as @supabase/ssr stores it. */
async function signInAs(context: BrowserContext, token: "employee-token" | "owner-token") {
  const session = {
    // A unique suffix gives every test its own fixture state in the mock backend.
    access_token: `${token}:${crypto.randomUUID()}`,
    refresh_token: "e2e-refresh",
    token_type: "bearer",
    expires_in: 86_400,
    expires_at: Math.floor(Date.now() / 1000) + 86_400,
    user: { id: token, aud: "authenticated", role: "authenticated", email: `${token}@acme-demo.test`, app_metadata: {}, user_metadata: {} },
  };
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  await context.addCookies([{ name: "sb-127-auth-token", value, url: LOCAL_ORIGIN }]);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page should not scroll sideways").toBeLessThanOrEqual(1);
}

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    // Recharts renders its own SVG internals; the chart has a text alternative on its container.
    .exclude(".recharts-wrapper")
    .analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
}

test.describe("employee", () => {
  test.beforeEach(async ({ context }) => signInAs(context, "employee-token"));

  for (const { path, heading } of [
    { path: "/dashboard", heading: /Good (morning|afternoon|evening), Chiamaka/ },
    { path: "/my-attendance", heading: "My attendance" },
    { path: "/my-leave", heading: "My leave" },
    { path: "/my-tasks", heading: "My tasks" },
    { path: "/notifications", heading: "Notifications" },
    { path: "/profile", heading: "My profile" },
  ]) {
    test(`${path} renders, fits the screen and has no serious accessibility violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await expectNoHorizontalOverflow(page);
      await expectAccessible(page);
    });
  }

  test("the employee cannot see administration in the navigation", async ({ page, isMobile }) => {
    await page.goto("/dashboard");
    if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
    const nav = page.getByRole("navigation", { name: "Main" }).last();
    await expect(nav.getByRole("link", { name: "My attendance" })).toBeVisible();
    for (const label of ["Employees", "Departments", "Reports", "Audit trail", "Settings"]) {
      await expect(nav.getByRole("link", { name: label, exact: true })).toHaveCount(0);
    }
  });

  test("clock-in is one tap away on a phone and succeeds only after the server confirms", async ({ page, context, isMobile }) => {
    await context.grantPermissions(["geolocation"], { origin: LOCAL_ORIGIN });
    await context.setGeolocation({ ...OFFICE, accuracy: 12 });

    await page.goto("/dashboard");
    if (isMobile) await expect(page.getByRole("navigation", { name: "Quick navigation" })).toBeVisible();

    const clockIn = page.getByRole("button", { name: "Clock in" });
    await expect(clockIn).toBeVisible();
    const box = await clockIn.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44); // comfortable touch target

    const response = page.waitForResponse((r) => r.url().endsWith("/api/attendance/clock-in"));
    await clockIn.click();
    const request = (await response).request();

    // The browser sends raw coordinates only - never a verdict about the geofence or a time.
    const sent = request.postDataJSON();
    expect(Object.keys(sent).sort()).toEqual(["accuracyMeters", "latitude", "longitude"]);

    await expect(page.getByText("Attendance recorded")).toBeVisible();
  });

  test("a denied location permission is explained and nothing is recorded", async ({ page, context }) => {
    await context.clearPermissions();
    let clockInCalled = false;
    page.on("request", (r) => { if (r.url().endsWith("/api/attendance/clock-in")) clockInCalled = true; });

    await page.goto("/my-attendance");
    await page.getByRole("button", { name: "Clock in" }).click();

    await expect(page.getByRole("alert").filter({ hasText: /location/i })).toBeVisible({ timeout: 20_000 });
    expect(clockInCalled).toBe(false);
    await expect(page.getByText("Attendance recorded")).toHaveCount(0);
  });

  test("the leave request dialog fits a phone and submits", async ({ page }) => {
    await page.goto("/my-leave");
    await page.getByRole("button", { name: "Request leave" }).first().click();

    const dialog = page.getByRole("dialog", { name: "Request leave" });
    await expect(dialog).toBeVisible();
    await expectAccessible(page);

    const viewport = page.viewportSize()!;
    const box = await dialog.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(viewport.width + 1);

    await dialog.getByLabel("Leave type").selectOption({ label: "Annual Leave" });
    await dialog.getByLabel("Reason").fill("Family wedding");
    await page.getByRole("button", { name: "Submit request" }).click();
    await expect(page.getByText("Leave requested")).toBeVisible();
  });

  test("a task can be started from the task list", async ({ page }) => {
    await page.goto("/my-tasks");
    const row = page.getByRole("listitem").filter({ hasText: "Prepare September sales report" });
    await row.getByRole("button", { name: "Start" }).click();
    await expect(page.getByText("Task started")).toBeVisible();
  });

  test("opening an unread notification marks it read and follows its link", async ({ page }) => {
    await page.goto("/notifications");
    const read = page.waitForRequest((r) => r.method() === "POST" && /\/api\/notifications\/.+\/read$/.test(r.url()));
    await page.getByRole("button", { name: /You have a new task/ }).click();
    await read;
    await expect(page).toHaveURL(/\/my-tasks$/);
  });

  test("the mobile menu opens, is navigable and closes", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Drawer is the phone navigation");
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("navigation", { name: "Main" }).last().getByRole("link", { name: "My leave" }).click();
    await expect(page).toHaveURL(/\/my-leave$/);
    await expect(page.getByRole("button", { name: "Close menu" })).toHaveCount(0);
  });
});

test.describe("owner", () => {
  test.beforeEach(async ({ context }) => signInAs(context, "owner-token"));

  for (const { path, heading } of [
    { path: "/dashboard", heading: /Good (morning|afternoon|evening), Ada/ },
    { path: "/employees", heading: "Employees" },
    { path: "/departments", heading: "Departments" },
    { path: "/attendance", heading: "Attendance" },
    { path: "/leave", heading: "Leave" },
    { path: "/tasks", heading: "Tasks" },
    { path: "/reports", heading: "Reports" },
    { path: "/audit", heading: "Audit trail" },
    { path: "/settings", heading: "Settings" },
  ]) {
    test(`${path} renders, fits the screen and has no serious accessibility violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await expectNoHorizontalOverflow(page);
      await expectAccessible(page);
    });
  }

  test("tables become cards on a phone", async ({ page, isMobile }) => {
    await page.goto("/employees");
    if (isMobile) {
      await expect(page.getByRole("table")).toBeHidden();
      await expect(page.getByRole("listitem").filter({ hasText: "Chiamaka Eze" })).toBeVisible();
    } else {
      await expect(page.getByRole("table")).toBeVisible();
      await expect(page.getByRole("cell", { name: /Chiamaka Eze/ })).toBeVisible();
    }
  });

  test("deactivating an employee asks for confirmation first", async ({ page }) => {
    await page.goto("/employees/00000000-0000-0000-0000-0000000000e2");
    await page.getByRole("button", { name: "Change status" }).click();
    await page.getByRole("dialog", { name: /Change status/ }).getByLabel("Status").selectOption({ label: "Terminated" });
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("dialog", { name: /Mark Tunde Adeyemi as terminated/ })).toBeVisible();
    await expect(page.getByText(/no longer be able to clock in/)).toBeVisible();
  });
});
