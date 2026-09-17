import { expect, test, type Page } from "@playwright/test";

/**
 * The pilot golden flow against a real staging stack. See README.md in this folder for the
 * accounts and variables required. Skipped - not passed - when they are missing.
 */

const env = (name: string) => process.env[name] ?? "";
const configured = ["E2E_BASE_URL", "E2E_OWNER_A_EMAIL", "E2E_OWNER_A_PASSWORD", "E2E_MANAGER_A_EMAIL",
  "E2E_MANAGER_A_PASSWORD", "E2E_EMPLOYEE_A_EMAIL", "E2E_EMPLOYEE_A_PASSWORD"].every((name) => env(name));

test.skip(!configured, "Staging E2E variables are not set - see e2e/staging/README.md");

const OFFICE = { latitude: 6.4281, longitude: 3.4219 };

async function signIn(page: Page, emailVar: string, passwordVar: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env(emailVar));
  await page.getByLabel("Password").fill(env(passwordVar));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
}

test.describe.serial("golden flow", () => {
  const unique = `E2E ${Date.now()}`;

  test("employee signs in, allows location and clocks in at the office @mobile", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ ...OFFICE, accuracy: 15 });

    await signIn(page, "E2E_EMPLOYEE_A_EMAIL", "E2E_EMPLOYEE_A_PASSWORD");
    await page.goto("/my-attendance");

    const clockIn = page.getByRole("button", { name: "Clock in" });
    const clockOut = page.getByRole("button", { name: "Clock out" });

    if (await clockIn.isVisible()) {
      await clockIn.click();
      await expect(page.getByText("Attendance recorded")).toBeVisible({ timeout: 30_000 });
    }

    await expect(clockOut.or(page.getByText("completed your attendance"))).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("clock-in outside the geofence is refused with a clear message", async ({ browser }) => {
    const context = await browser.newContext({ geolocation: { latitude: 9.0765, longitude: 7.3986 }, permissions: ["geolocation"] });
    const page = await context.newPage();
    // Uses the manager account so the employee's attendance for today is unaffected.
    await signIn(page, "E2E_MANAGER_A_EMAIL", "E2E_MANAGER_A_PASSWORD");
    await page.goto("/my-attendance");

    const clockIn = page.getByRole("button", { name: "Clock in" });
    test.skip(!(await clockIn.isVisible()), "Manager has already recorded attendance today");
    await clockIn.click();
    await expect(page.getByText(/outside the allowed work location/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Attendance recorded")).toHaveCount(0);
    await context.close();
  });

  test("manager sees the attendance and assigns a task", async ({ page }) => {
    await signIn(page, "E2E_MANAGER_A_EMAIL", "E2E_MANAGER_A_PASSWORD");
    await page.goto("/attendance");
    await expect(page.getByRole("heading", { name: "Attendance" })).toBeVisible();

    await page.goto("/tasks");
    await page.getByRole("button", { name: "New task" }).click();
    await page.getByLabel("Title").fill(`${unique} report`);
    await page.getByLabel("Assign to").selectOption({ index: 1 });
    await page.getByLabel("Priority").selectOption({ label: "High" });
    await page.getByRole("button", { name: "Create task" }).click();
    await expect(page.getByText("Task created")).toBeVisible();
  });

  test("employee sees the task, starts it and reads the notification @mobile", async ({ page }) => {
    await signIn(page, "E2E_EMPLOYEE_A_EMAIL", "E2E_EMPLOYEE_A_PASSWORD");

    await page.goto("/notifications");
    const notice = page.getByRole("button", { name: /You have a new task/ }).first();
    await expect(notice).toBeVisible();

    await page.goto("/my-tasks");
    const row = page.getByRole("listitem").filter({ hasText: `${unique} report` });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Start" }).click();
    await expect(page.getByText("Task started")).toBeVisible();
  });

  test("employee requests leave", async ({ page }) => {
    await signIn(page, "E2E_EMPLOYEE_A_EMAIL", "E2E_EMPLOYEE_A_PASSWORD");
    await page.goto("/my-leave");
    await page.getByRole("button", { name: "Request leave" }).first().click();

    const start = new Date();
    start.setDate(start.getDate() + 60 + ((8 - start.getDay()) % 7));
    const iso = start.toISOString().slice(0, 10);

    await page.getByLabel("Leave type").selectOption({ label: "Casual Leave" });
    await page.getByLabel("First day").fill(iso);
    await page.getByLabel("Last day").fill(iso);
    await page.getByLabel("Reason").fill(unique);
    await page.getByRole("button", { name: "Submit request" }).click();
    await expect(page.getByText("Leave requested")).toBeVisible();
  });

  test("manager is notified and approves; employee sees the approval", async ({ page, browser }) => {
    await signIn(page, "E2E_MANAGER_A_EMAIL", "E2E_MANAGER_A_PASSWORD");
    await page.goto("/leave");
    const request = page.getByRole("listitem").filter({ hasText: unique });
    await expect(request).toBeVisible();
    await request.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Leave approved")).toBeVisible();

    const employeeContext = await browser.newContext();
    const employee = await employeeContext.newPage();
    await signIn(employee, "E2E_EMPLOYEE_A_EMAIL", "E2E_EMPLOYEE_A_PASSWORD");
    await employee.goto("/notifications");
    await expect(employee.getByText(/was approved/).first()).toBeVisible();
    await employeeContext.close();
  });

  test("the employee cannot reach administration pages or another employee", async ({ page }) => {
    await signIn(page, "E2E_EMPLOYEE_A_EMAIL", "E2E_EMPLOYEE_A_PASSWORD");
    await page.goto("/audit");
    await expect(page.getByText("You don't have access to this page")).toBeVisible();
    await expect(page.getByRole("link", { name: "Employees" })).toHaveCount(0);
  });

  test("company A cannot open a company B employee", async ({ page }) => {
    test.skip(!env("E2E_EMPLOYEE_B_ID"), "E2E_EMPLOYEE_B_ID not set");
    await signIn(page, "E2E_OWNER_A_EMAIL", "E2E_OWNER_A_PASSWORD");
    await page.goto(`/employees/${env("E2E_EMPLOYEE_B_ID")}`);
    await expect(page.getByText(/couldn't find that employee/i)).toBeVisible();
  });

  test("owner sees today's attendance in reports and the audit trail", async ({ page }) => {
    await signIn(page, "E2E_OWNER_A_EMAIL", "E2E_OWNER_A_PASSWORD");
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
    await page.goto("/audit");
    await expect(page.getByText(/Attendance clock in/i).first()).toBeVisible();
  });

  test("employee clocks out @mobile", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ ...OFFICE, accuracy: 15 });
    await signIn(page, "E2E_EMPLOYEE_A_EMAIL", "E2E_EMPLOYEE_A_PASSWORD");
    await page.goto("/my-attendance");

    const clockOut = page.getByRole("button", { name: "Clock out" });
    if (await clockOut.isVisible()) {
      await clockOut.click();
      await expect(page.getByText("Clocked out")).toBeVisible({ timeout: 30_000 });
    }
    await expect(page.getByText("completed your attendance")).toBeVisible();
  });
});
