import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * The Workeva Intelligence screens in a real browser at desktop, Android-sized and iPhone-sized
 * viewports, backed by e2e/mock-backend.mjs.
 *
 * MOCKED, DELIBERATELY: this proves the interface works - the dashboard on a phone, the alert
 * actions, the assistant's transcript, accessibility, no sideways scroll. It proves nothing about
 * authorization, which is covered by IntelligenceSecurityTests (21, API on PostgreSQL) and
 * IntelligenceRlsTests (8, the database roles themselves).
 *
 * What it does prove, and what no backend test can, is the product's honesty rules at the point
 * a person actually reads them: that an approximate figure is labelled, that an unavailable
 * figure is not rendered as a zero, that a risk score carries its caveat and its evidence, and
 * that an insufficient-data assessment shows no score at all.
 */

const LOCAL_ORIGIN = "http://localhost:3100";

async function signInAs(context: BrowserContext, token: "employee-token" | "owner-token") {
  const session = {
    access_token: `${token}:${crypto.randomUUID()}`,
    refresh_token: "e2e-refresh",
    token_type: "bearer",
    expires_in: 86_400,
    expires_at: Math.floor(Date.now() / 1000) + 86_400,
    user: {
      id: token,
      aud: "authenticated",
      role: "authenticated",
      email: `${token}@acme-demo.test`,
      app_metadata: {},
      user_metadata: {},
    },
  };

  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  await context.addCookies([{ name: "sb-127-auth-token", value, url: LOCAL_ORIGIN }]);
}

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude(".recharts-wrapper")
    .analyze();

  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

/** No sideways scroll at any viewport. A dashboard that scrolls sideways on a phone is broken. */
async function expectNoHorizontalScroll(page: Page) {
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflows).toBe(false);
}

// =============================================================================================
// The dashboard
// =============================================================================================

test.describe("intelligence dashboard", () => {
  test.beforeEach(async ({ context }) => {
    await signInAs(context, "owner-token");
  });

  test("shows the headline figures, what needs attention, and when the sweep last ran", async ({
    page,
  }) => {
    await page.goto(`${LOCAL_ORIGIN}/intelligence`);

    await expect(page.getByRole("heading", { name: "Intelligence", level: 1 })).toBeVisible();

    // The headline figures.
    await expect(page.getByText("Organization health")).toBeVisible();
    await expect(page.getByText("78.5 out of 100")).toBeVisible();

    // The sweep status. This is the line that makes an empty alerts list readable, so its
    // presence is a product requirement rather than a nicety.
    await expect(page.getByText(/Alert detection: last ran/)).toBeVisible();
    await expect(page.getByText(/Risk assessment: last ran/)).toBeVisible();

    // The open alerts, most severe first.
    await expect(
      page.getByText("Harbour expansion is 12 days overdue"),
    ).toBeVisible();

    await expectNoHorizontalScroll(page);
  });

  test("labels an approximate figure rather than presenting it as a fact", async ({ page }) => {
    await page.goto(`${LOCAL_ORIGIN}/intelligence`);

    // The attendance rate is an approximation - its denominator does not know about public
    // holidays - and the card has to say so where the number is, not in a tooltip.
    const card = page
      .locator("div")
      .filter({ hasText: "Attendance rate" })
      .filter({ hasText: "91.4%" })
      .first();

    await expect(card).toContainText("Approximate");
    await expect(card).toContainText("Public holidays are not deducted");
  });

  test("shows an unavailable figure as unavailable, never as zero", async ({ page }) => {
    await page.goto(`${LOCAL_ORIGIN}/intelligence`);

    const card = page
      .locator("div")
      .filter({ hasText: "Project delivery performance" })
      .first();

    await expect(card).toContainText("Not available");
    await expect(card).toContainText("No projects were completed");

    // The actual requirement: no zero anywhere on that card. A zero here would read as "nothing
    // was delivered", which is the opposite of "we cannot tell".
    await expect(card).not.toContainText(/\b0\b/);
  });

  test("counts how many times an alert has been detected", async ({ page }) => {
    await page.goto(`${LOCAL_ORIGIN}/intelligence`);

    // Showing the occurrence count is what makes the deduplication legible. Without it, one row
    // for a fortnight-old problem looks like the product missed twenty-three detections.
    await expect(page.getByText("Detected 24 times")).toBeVisible();
  });

  test("is accessible", async ({ page }) => {
    await page.goto(`${LOCAL_ORIGIN}/intelligence`);
    await expect(page.getByRole("heading", { name: "Intelligence", level: 1 })).toBeVisible();
    await expectAccessible(page);
  });
});

// =============================================================================================
// Alerts
// =============================================================================================

test.describe("alerts", () => {
  test.beforeEach(async ({ context }) => {
    await signInAs(context, "owner-token");
  });

  test("shows an alert's evidence on request", async ({ page }) => {
    await page.goto(`${LOCAL_ORIGIN}/intelligence/alerts`);

    await expect(page.getByText("Harbour expansion is 12 days overdue")).toBeVisible();

    // The numbers behind the alert are available rather than hidden, because an alert a manager
    // cannot interrogate is an alert they learn to ignore.
    await page.getByRole("button", { name: "Show the numbers" }).first().click();

    await expect(page.getByText("Days overdue").first()).toBeVisible();
    await expect(page.getByText("Progress %").first()).toBeVisible();
  });

  test("acknowledging and resolving are separate actions", async ({ page }) => {
    await page.goto(`${LOCAL_ORIGIN}/intelligence/alerts`);

    const openAlert = page
      .locator("div")
      .filter({ hasText: "Harbour expansion is 12 days overdue" })
      .first();

    // Both offered on an open alert: "I have seen this" and "it is dealt with" are different
    // claims, and a page offering only the second gets alerts marked fixed when they are read.
    await expect(openAlert.getByRole("button", { name: "Acknowledge" })).toBeVisible();
    await expect(openAlert.getByRole("button", { name: "Resolve" })).toBeVisible();

    await openAlert.getByRole("button", { name: "Resolve" }).click();

    await expect(page.getByText(/Resolved\.?/).first()).toBeVisible();
  });

  test("an employee cannot acknowledge or resolve", async ({ context, page }) => {
    // The employee token holds intelligence.view but not intelligence.alert.manage. The buttons
    // are absent - and the API refuses it regardless, which is what the backend tests assert.
    await context.clearCookies();
    await signInAs(context, "employee-token");

    await page.goto(`${LOCAL_ORIGIN}/intelligence/alerts`);

    await expect(page.getByText("Harbour expansion is 12 days overdue")).toBeVisible();
    await expect(page.getByRole("button", { name: "Acknowledge" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Resolve" })).toHaveCount(0);
  });

  test("is accessible and does not scroll sideways", async ({ page }) => {
    await page.goto(`${LOCAL_ORIGIN}/intelligence/alerts`);
    await expect(page.getByRole("heading", { name: "Alerts", level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
  });
});

// =============================================================================================
// Risk
// =============================================================================================

test.describe("operational risk", () => {
  test.beforeEach(async ({ context }) => {
    await signInAs(context, "owner-token");
  });

  test("carries its caveat, its evidence and its method", async ({ page }) => {
    await page.goto(`${LOCAL_ORIGIN}/intelligence/risks`);

    await expect(page.getByRole("heading", { name: "Operational risk", level: 1 })).toBeVisible();

    // The page-level caveat.
    await expect(
      page.getByText(/not facts, and not decisions/i),
    ).toBeVisible();

    await expect(page.getByText("Harbour expansion").first()).toBeVisible();
    await expect(page.getByText("81/100")).toBeVisible();

    // Confidence beside the band, always: a high score held with low confidence is a different
    // thing from a high score held with high confidence.
    await expect(page.getByText("High confidence")).toBeVisible();

    // And the working, on request - including the method version, so two assessments from
    // different versions are never silently compared.
    await page.getByRole("button", { name: "How this was worked out" }).first().click();

    await expect(
      page.getByText(/Method project_delivery\.schedule_vs_progress v1/),
    ).toBeVisible();

    await expect(
      page.getByText(/Workeva does not make employment, disciplinary or pay decisions/),
    ).toBeVisible();
  });

  test("shows no score at all when there is not enough data", async ({ page }) => {
    await page.goto(`${LOCAL_ORIGIN}/intelligence/risks`);

    await page.getByLabel(/Include subjects that can't be assessed yet/).check();

    const card = page.locator("div").filter({ hasText: "Chiamaka Eze" }).first();

    await expect(card).toContainText("Not enough data");

    // The stored score is zero, and showing it would read as "assessed, and fine" - which is the
    // opposite of what an insufficient-data result means.
    await expect(card).not.toContainText("/100");
  });

  test("is accessible", async ({ page }) => {
    await page.goto(`${LOCAL_ORIGIN}/intelligence/risks`);
    await expect(page.getByRole("heading", { name: "Operational risk", level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
  });
});

// =============================================================================================
// Ask Workeva
// =============================================================================================

test.describe("ask workeva", () => {
  test.beforeEach(async ({ context }) => {
    await signInAs(context, "owner-token");
  });

  test("shows the figures an answer was written from, and who wrote it", async ({ page }) => {
    await page.goto(`${LOCAL_ORIGIN}/intelligence/ask`);

    await expect(page.getByRole("heading", { name: "Ask Workeva", level: 1 })).toBeVisible();

    await page.getByRole("button", { name: /How is attendance this month\?/ }).first().click();

    // The prose.
    await expect(page.getByText(/Attendance rate for this month: 91\.4%/)).toBeVisible();

    // The evidence beneath it, rendered by the app from the backend's own figures. An answer
    // whose numbers cannot be checked is an answer nobody should act on.
    await expect(page.getByText("Days attended").first()).toBeVisible();

    // And the provenance. With no model configured the page says the prose came from a template
    // rather than implying a model was involved.
    await expect(page.getByText("Written from a template").first()).toBeVisible();
  });

  test("shows what allowance is left before it runs out", async ({ page }) => {
    await page.goto(`${LOCAL_ORIGIN}/intelligence/ask`);

    // 200 limit, 7 used. A user told "193 left" behaves differently from one who finds out by
    // hitting the limit.
    await expect(page.getByText(/193/)).toBeVisible();
    await expect(page.getByText(/questions left today/)).toBeVisible();
  });

  test("renders a refusal as an answer rather than an error", async ({ page }) => {
    await page.goto(`${LOCAL_ORIGIN}/intelligence/ask`);

    await page
      .getByLabel("Your question")
      .fill("What is the average salary in engineering?");

    await page.getByRole("button", { name: "Ask" }).click();

    // A refusal is a successful answer. The page must not show an error state for it, and it
    // must say why rather than failing silently.
    await expect(
      page.getByText(/Workeva does not hold pay or payroll data/).first(),
    ).toBeVisible();

    await expect(page.getByText(/Something went wrong/)).toHaveCount(0);
  });

  test("is accessible", async ({ page }) => {
    await page.goto(`${LOCAL_ORIGIN}/intelligence/ask`);
    await expect(page.getByRole("heading", { name: "Ask Workeva", level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
  });
});

// =============================================================================================
// Analytics and settings
// =============================================================================================

test.describe("analytics", () => {
  test.beforeEach(async ({ context }) => {
    await signInAs(context, "owner-token");
  });

  test("groups the figures by family and states each one's period", async ({ page }) => {
    await page.goto(`${LOCAL_ORIGIN}/intelligence/insights`);

    await expect(page.getByRole("heading", { name: "Analytics", level: 1 })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Organization" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Workforce, attendance and leave" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Projects, tasks and workload" }),
    ).toBeVisible();

    // Every figure says what period it covers. A number without one is uninterpretable.
    await expect(page.getByText("this month").first()).toBeVisible();

    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
  });
});

test.describe("intelligence settings", () => {
  test.beforeEach(async ({ context }) => {
    await signInAs(context, "owner-token");
  });

  test("shows each rule's default beside its override", async ({ page }) => {
    await page.goto(`${LOCAL_ORIGIN}/intelligence/settings`);

    await expect(
      page.getByRole("heading", { name: "Intelligence settings", level: 1 }),
    ).toBeVisible();

    await expect(page.getByText("Repeated lateness")).toBeVisible();

    // The default shown beside the field is what lets an administrator see what a rule would do
    // before changing it, rather than having to change it to find out.
    await expect(page.getByText("Default 4").first()).toBeVisible();
    await expect(page.getByText("Default 14").first()).toBeVisible();
  });

  test("reports whether an AI service is configured, and never a key", async ({ page }) => {
    await page.goto(`${LOCAL_ORIGIN}/intelligence/settings`);

    await expect(page.getByText("No AI service is configured.")).toBeVisible();
    await expect(
      page.getByText(/The figures are exactly the same; only the wording is plainer/),
    ).toBeVisible();

    // A settings page is something anybody can screenshot.
    const body = (await page.textContent("body")) ?? "";
    expect(body).not.toMatch(/sk-ant|api[_-]?key/i);
  });

  test("saves a changed threshold", async ({ page }) => {
    await page.goto(`${LOCAL_ORIGIN}/intelligence/settings`);

    const threshold = page.getByLabel("Threshold").first();
    await threshold.fill("6");

    // Save appears only once something has changed, so a half-typed threshold on the way to
    // another value cannot be saved by accident.
    await page.getByRole("button", { name: "Save" }).first().click();

    await expect(page.getByText(/updated/).first()).toBeVisible();
  });

  test("is accessible", async ({ page }) => {
    await page.goto(`${LOCAL_ORIGIN}/intelligence/settings`);
    await expect(
      page.getByRole("heading", { name: "Intelligence settings", level: 1 }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
  });
});

// =============================================================================================
// Navigation
// =============================================================================================

test("intelligence is reachable from the main navigation", async ({ context, page }) => {
  await signInAs(context, "owner-token");

  await page.goto(`${LOCAL_ORIGIN}/dashboard`);

  await page.getByRole("link", { name: "Intelligence" }).first().click();

  await expect(page.getByRole("heading", { name: "Intelligence", level: 1 })).toBeVisible();
});
