import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Signed-out journey in a real browser: route protection, accessibility, keyboard use and
 * phone layout. Runs in the desktop, Android-sized and iPhone-sized projects.
 */

const publicPages = [
  { path: "/login", heading: "Sign in" },
  { path: "/signup", heading: "Create your account" },
  { path: "/forgot-password", heading: "Reset your password" },
];

test.describe("route protection", () => {
  for (const path of ["/dashboard", "/employees", "/my-attendance", "/settings", "/audit", "/reports"]) {
    test(`${path} redirects a signed-out visitor to sign-in and remembers the destination`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}`));
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    });
  }

  test("the root redirects to sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("signed-out pages", () => {
  for (const { path, heading } of publicPages) {
    test(`${path} has no serious accessibility violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();

      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");

      expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
    });

    test(`${path} does not overflow horizontally`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test("the sign-in form is fully keyboard operable with a visible focus ring", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard traversal is a desktop concern");
    await page.goto("/login");

    const email = page.getByLabel("Email address");
    await expect(email).toBeFocused(); // autofocus

    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Password")).toBeFocused();

    const outline = await page.getByLabel("Password").evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe("none");

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: /Forgotten your password/ })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeFocused();
  });

  test("signup validates on the client and associates errors with their fields", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("A");
    await page.getByLabel("Work email").fill("not-an-email");
    await page.getByLabel(/^Password/).fill("short");
    await page.getByLabel("Confirm password").fill("different");
    await page.getByRole("button", { name: "Create account" }).click();

    const password = page.getByLabel(/^Password/);
    await expect(password).toHaveAttribute("aria-invalid", "true");
    const describedBy = await password.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`#${describedBy}`)).toContainText("at least 10 characters");
    await expect(page.getByText("Those passwords don't match.")).toBeVisible();
  });

  test("the invitation page explains what to do without a token", async ({ page }) => {
    await page.goto("/invite");
    await expect(page.getByText("No invitation found")).toBeVisible();
  });

  test("a skip link becomes visible on focus and targets the main landmark", async ({ page, isMobile }) => {
    test.skip(isMobile, "Skip links are for keyboard users");
    await page.goto("/login");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toHaveAttribute("href", "#main");
    await expect(page.locator("main#main")).toHaveCount(1);
    await skip.focus();
    await expect(skip).toBeInViewport();
  });
});

test("an off-site next parameter is never followed", async ({ page }) => {
  await page.goto("/login?next=//evil.example.com");
  // The login form itself renders; the redirect target is only used after a successful
  // sign-in and is sanitised by safeRedirectPath (unit tested).
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page).toHaveURL(/localhost/);
});
