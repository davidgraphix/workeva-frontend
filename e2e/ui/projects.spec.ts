import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * The project screens in a real browser at desktop, Android-sized and iPhone-sized viewports,
 * backed by e2e/mock-backend.mjs.
 *
 * MOCKED, DELIBERATELY: this proves the interface works - the portfolio on a phone, the filters,
 * the detail page's panels, accessibility, no sideways scroll. It proves nothing about
 * authorization, which is covered by ProjectSecurityTests (16, API on PostgreSQL) and
 * ProjectRlsTests (18, the database roles themselves).
 */

const LOCAL_ORIGIN = "http://localhost:3100";

const WAREHOUSE_ID = "40000000-0000-0000-0000-000000000001";

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

  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page should not scroll sideways").toBeLessThanOrEqual(1);
}

test.describe("the portfolio", () => {
  test.beforeEach(async ({ context }) => signInAs(context, "owner-token"));

  test("shows the counts, the projects and who is carrying the work @mobile", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    // The five figures a manager opens this page for.
    await expect(page.getByText("At risk").first()).toBeVisible();
    await expect(page.getByText("Warehouse rollout").first()).toBeVisible();
    await expect(page.getByText("Payroll migration").first()).toBeVisible();

    // Progress is announced, not only drawn. Every card carries one.
    const bars = page.getByRole("progressbar");
    expect(await bars.count()).toBeGreaterThanOrEqual(2);
    await expect(bars.first()).toHaveAttribute("aria-valuenow", /^\d+$/);

    // The workload panel: who needs help, ordered by what has already slipped.
    await expect(page.getByText("Workload")).toBeVisible();
    await expect(page.getByText("Chiamaka Eze").first()).toBeVisible();
    await expect(page.getByText("2 late").first()).toBeVisible();

    // An escalation has no actor, so the feed names the system rather than a person.
    await expect(page.getByText("Recent activity")).toBeVisible();
    await expect(page.getByText(/Workeva/).first()).toBeVisible();

    await expectNoHorizontalOverflow(page);
    await expectAccessible(page);
  });

  test("filters the list without a full reload @mobile", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");

    const search = page.getByRole("searchbox", { name: /Search projects/i });
    await search.fill("payroll");

    // Debounced, so the request follows the typing rather than racing it.
    await page.waitForRequest((r) => r.url().includes("/api/v2/projects") && r.url().includes("search=payroll"));

    await expect(page.getByRole("checkbox", { name: "Only mine" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Only at risk" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("opens the new-project form and will not submit it empty", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "New project" }).click();

    const dialog = page.getByRole("dialog", { name: "New project" });
    await expect(dialog).toBeVisible();

    // The owner defaults to the person creating it, because a required field with no sensible
    // default is a form people abandon.
    await expect(dialog.getByLabel(/Owner/)).not.toHaveValue("");

    // And a nameless project cannot be created.
    await expect(dialog.getByRole("button", { name: "Create project" })).toBeDisabled();

    await expectAccessible(page);
  });
});

test.describe("one project", () => {
  test.beforeEach(async ({ context }) => signInAs(context, "owner-token"));

  test("shows its figures, its work and its people @mobile", async ({ page }) => {
    await page.goto(`/projects/${WAREHOUSE_ID}`);
    await expect(page.getByRole("heading", { level: 1, name: "Warehouse rollout" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    // Overall progress, stated in words as well as width.
    await expect(page.getByRole("progressbar", { name: "Overall progress" })).toHaveAttribute(
      "aria-valuenow",
      "45",
    );

    // The work, including the one task that is blocked and the subtask beneath its parent.
    // Named as rows rather than as text: the activity feed on the same page quotes task
    // titles, so a bare text match finds the row and the history entry about it.
    await expect(page.getByRole("button", { name: /Survey the Ikeja site/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Fit out the racking/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Order the shelving/ })).toBeVisible();
    await expect(page.getByText(/^Blocked/).first()).toBeVisible();

    // Its people, with their workload. The panel heading, not the stat card of the same name.
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
    await expect(page.getByText("Ibrahim Bello").first()).toBeVisible();

    await expectNoHorizontalOverflow(page);
    await expectAccessible(page);
  });

  test("opens a task's panels and explains that attachments need storage @mobile", async ({ page }) => {
    await page.goto(`/projects/${WAREHOUSE_ID}`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /Fit out the racking/ }).click();

    // The four panels that hang off a task.
    // The panel headings, not the card description that happens to mention a checklist.
    await expect(page.getByRole("heading", { name: "Checklist" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Comments" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Waiting for" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Attachments" })).toBeVisible();

    await expect(page.getByText("Measure the bays")).toBeVisible();
    await expect(page.getByText("Racking supplier confirmed for Tuesday.")).toBeVisible();

    // This deployment has no object storage - the state a development environment is in - so the
    // API answers 503 and the panel explains it rather than showing a failure. The other panels
    // keep working, which is the point of the 503 being narrow.
    await expect(page.getByText(/File storage isn't set up/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Attach/ })).toHaveCount(0);

    await expectNoHorizontalOverflow(page);
    await expectAccessible(page);
  });

  test("offers archiving behind a confirmation that says what it does", async ({ page }) => {
    await page.goto(`/projects/${WAREHOUSE_ID}`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Archive" }).click();

    const dialog = page.getByRole("dialog", { name: /Archive this project/ });
    await expect(dialog).toBeVisible();

    // Says what survives, because "archive" reads as "delete" to a lot of people.
    await expect(dialog.getByText(/Nothing is deleted/)).toBeVisible();

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });
});

test.describe("an ordinary employee", () => {
  test.beforeEach(async ({ context }) => signInAs(context, "employee-token"));

  /**
   * An employee holds project.view, so the menu item and the page are theirs - they simply see
   * only the projects they are on. What they must not see is the controls for running the
   * portfolio, and the API refuses those independently.
   */
  test("sees the projects page without the controls for running one @mobile", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("button", { name: "New project" })).toHaveCount(0);

    await expectNoHorizontalOverflow(page);
    await expectAccessible(page);
  });
});

test.describe("the escalation ladder", () => {
  test.beforeEach(async ({ context }) => signInAs(context, "owner-token"));

  test("shows the default ladder and says that adding a rung replaces it", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Overdue escalation" }).click();

    await expect(page.getByText("Day 1")).toBeVisible();
    await expect(page.getByText("Day 5")).toBeVisible();
    await expect(page.locator("ol").getByText("The assignee")).toBeVisible();

    // A company that has configured nothing is told it is on the default, and what happens if
    // it writes a rule of its own.
    await expect(page.getByText(/You are on the default ladder/)).toBeVisible();
    await expect(page.getByText(/replaces this ladder entirely/)).toBeVisible();

    await expectNoHorizontalOverflow(page);
    await expectAccessible(page);
  });
});
