import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("landing page loads with hero section", async ({ page }) => {
    // GIVEN: User visits the homepage
    await page.goto("/");

    // WHEN: Page loads
    // THEN: Hero section is visible with brand content
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test("landing page has header element", async ({ page }) => {
    // GIVEN: User visits the homepage
    await page.goto("/");

    // THEN: Header element is present (the Nav component renders a <header>)
    await expect(page.locator("header")).toBeVisible({ timeout: 10_000 });
  });

  test("landing page has footer", async ({ page }) => {
    // GIVEN: User visits the homepage
    await page.goto("/");

    // THEN: Footer is visible
    const footer = page.locator("footer");
    await expect(footer).toBeVisible({ timeout: 10_000 });
  });

  test("login link navigates to login page", async ({ page }) => {
    // GIVEN: User is on the landing page
    await page.goto("/");

    // WHEN: User clicks login link
    const loginLink = page.locator('a[href="/login"]').first();
    await expect(loginLink).toBeVisible({ timeout: 10_000 });
    await loginLink.click();

    // THEN: Navigated to login page
    await expect(page).toHaveURL(/\/login/);
  });
});
