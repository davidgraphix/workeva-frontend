import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * Operations screens in a real browser at desktop, Android-sized and iPhone-sized viewports,
 * backed by e2e/mock-backend.mjs.
 *
 * MOCKED, DELIBERATELY: this proves the interface works - the field form on a phone, the
 * filters, the review controls, accessibility, no sideways scroll. It proves nothing about
 * authorization, which is covered by OperationsTests (24, API on PostgreSQL) and
 * OperationsRlsTests (9, the database roles themselves).
 */

const LOCAL_ORIGIN = "http://localhost:3100";

async function signInAs(context: BrowserContext, token: "employee-token" | "owner-token") {
  const session = {
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

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude(".recharts-wrapper")
    .analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

/** Opens the first report: a named button on desktop, the whole card on a phone. */
async function openFirstReport(page: Page, isMobile: boolean | undefined) {
  const opener = isMobile
    ? page.getByRole("button", { name: /Open .* report$/i })
    : page.getByRole("button", { name: /^(Review|Open)$/ });
  await opener.first().click();
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page should not scroll sideways").toBeLessThanOrEqual(1);
}

test.describe("field worker", () => {
  test.beforeEach(async ({ context }) => signInAs(context, "employee-token"));

  test("sees today's shifts for an assigned location and files a morning report @mobile", async ({ page }) => {
    await page.goto("/my-operations");
    await expect(page.getByRole("heading", { level: 1, name: "My operations" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("North Farm").first()).toBeVisible();
    await expect(page.getByText("Not reported yet").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    // The whole point of the screen: one tap to report the shift you are standing in.
    const report = page.getByRole("button", { name: "Report" }).first();
    const box = await report.boundingBox();
    expect(box!.height, "comfortable touch target").toBeGreaterThanOrEqual(44);

    const submission = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/api/operations/reports"));
    await report.click();

    const dialog = page.getByRole("dialog", { name: /Morning report/ });
    await expect(dialog).toBeVisible();
    await expectAccessible(page);

    // The unit comes from the activity, so nobody has to remember it.
    await dialog.getByLabel("What was done").selectOption({ label: "Harvesting (kg)" });
    await expect(dialog.getByLabel("How much (kg)")).toBeVisible();
    await dialog.getByLabel("How much (kg)").fill("120.5");
    await dialog.getByRole("button", { name: "Submit report" }).click();

    const sent = (await submission).postDataJSON();
    expect(sent.operationLocationId).toBe("f1");
    expect(sent.shift).toBe(0);
    expect(sent.lines).toEqual([{ activityId: "act-harvest", quantity: 120.5, notes: null }]);
    // The client never sends identity, status or a submission time.
    expect(sent.employeeId ?? null).toBeNull();
    expect(sent).not.toHaveProperty("status");
    expect(sent).not.toHaveProperty("submittedAt");

    await expect(page.getByText("Report submitted")).toBeVisible();
  });

  test("cannot submit an empty report", async ({ page }) => {
    await page.goto("/my-operations");
    await page.getByRole("button", { name: "Report" }).first().click();

    const dialog = page.getByRole("dialog", { name: /Morning report/ });
    await dialog.getByRole("button", { name: "Submit report" }).click();

    await expect(page.getByText(/at least one activity/i)).toBeVisible();
    await expect(dialog).toBeVisible();
  });

  test("does not see the administration side of Operations", async ({ page, isMobile }) => {
    await page.goto("/my-operations");
    if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();

    const nav = page.getByRole("navigation", { name: "Main" }).last();
    await expect(nav.getByRole("link", { name: "My operations" })).toBeVisible();
    for (const label of ["Locations", "Activities", "Field reports"]) {
      await expect(nav.getByRole("link", { name: label, exact: true })).toHaveCount(0);
    }
  });
});

test.describe("owner", () => {
  test.beforeEach(async ({ context }) => signInAs(context, "owner-token"));

  for (const { path, heading } of [
    { path: "/operations", heading: "Operations" },
    { path: "/operations/locations", heading: "Locations" },
    { path: "/operations/activities", heading: "Activities" },
    { path: "/operations/reports", heading: "Field reports" },
  ]) {
    test(`${path} renders, fits the screen and has no serious accessibility violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await expectNoHorizontalOverflow(page);
      await expectAccessible(page);
    });
  }

  test("the dashboard shows totals that come from reported rows", async ({ page }) => {
    await page.goto("/operations");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Active locations")).toBeVisible();
    await expect(page.getByText("Harvesting")).toBeVisible();
    await expect(page.getByText(/340\.5/)).toBeVisible();
    await expect(page.getByText("North Farm").first()).toBeVisible();
  });

  test("reviews a report: approving sends the decision to the server", async ({ page, isMobile }) => {
    await page.goto("/operations/reports");
    await page.waitForLoadState("networkidle");

    // "Open menu" on a phone also matches /Open/, so the name is precise here.
    await openFirstReport(page, isMobile);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await expect(dialog.getByText("Harvesting")).toBeVisible();
    await expect(dialog.getByText(/120\.5/)).toBeVisible();

    const review = page.waitForRequest((r) => r.method() === "POST" && /\/api\/operations\/reports\/.+\/review$/.test(r.url()));
    await dialog.getByRole("button", { name: "Approve" }).click();
    expect((await review).postDataJSON()).toEqual({ approve: true, note: null });
  });

  test("returning a report insists on a reason", async ({ page, isMobile }) => {
    await page.goto("/operations/reports");
    await page.waitForLoadState("networkidle");

    // "Open menu" on a phone also matches /Open/, so the name is precise here.
    await openFirstReport(page, isMobile);
    const dialog = page.getByRole("dialog");

    await dialog.getByRole("button", { name: /Return for changes/ }).click();
    await dialog.getByRole("button", { name: /Send back/ }).click();
    await expect(page.getByText(/say what needs correcting/i)).toBeVisible();

    const review = page.waitForRequest((r) => r.method() === "POST" && /\/review$/.test(r.url()));
    await dialog.getByLabel(/what needs correcting/i).fill("Recount the harvest");
    await dialog.getByRole("button", { name: /Send back/ }).click();

    expect((await review).postDataJSON()).toEqual({ approve: false, note: "Recount the harvest" });
  });

  test("the report filters drive the request to the server", async ({ page }) => {
    await page.goto("/operations/reports");
    await page.waitForLoadState("networkidle");

    const filtered = page.waitForRequest((r) =>
      r.url().includes("/api/operations/reports?") && r.url().includes("shift=1"));

    await page.getByLabel("Shift").selectOption({ label: "Evening" });
    const request = await filtered;

    // A filter that does not reach the server is a fake control.
    expect(request.url()).toContain("shift=1");
  });

  test("a location can be created from the locations screen", async ({ page }) => {
    await page.goto("/operations/locations");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /Add location/ }).first().click();
    const dialog = page.getByRole("dialog", { name: /Add a location/ });
    await expect(dialog).toBeVisible();
    await expectAccessible(page);

    await dialog.getByLabel("Name").fill("East Farm");
    await expect(dialog.getByLabel("Type")).toBeVisible();
    await dialog.getByRole("button", { name: /Add location/ }).click();

    // The mock accepts the POST; what matters here is that the form submits rather than
    // silently doing nothing.
    await expect(page.getByRole("dialog", { name: /Add a location/ })).toHaveCount(0, { timeout: 15_000 });
  });

  test("tables become cards on a phone", async ({ page, isMobile }) => {
    await page.goto("/operations/reports");
    await page.waitForLoadState("networkidle");

    if (isMobile) {
      await expect(page.getByRole("table")).toBeHidden();
      // The filter has an <option> with the same text, so target the card itself.
      await expect(page.getByRole("button", { name: /Open .* report$/i }).first()).toBeVisible();
    } else {
      await expect(page.getByRole("table")).toBeVisible();
    }
  });
});
