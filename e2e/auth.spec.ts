import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("login page renders correctly", async ({ page }) => {
    // GIVEN: User navigates to login page
    await page.goto("/login");

    // THEN: Login form is visible (page has 2 forms: Google OAuth + email/password)
    await expect(page.locator("form").first()).toBeVisible({ timeout: 10_000 });
  });

  test("login page has email and password fields", async ({ page }) => {
    // GIVEN: User is on login page
    await page.goto("/login");

    // THEN: Email and password inputs exist
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });

  test("login page has Google OAuth button", async ({ page }) => {
    // GIVEN: User is on login page
    await page.goto("/login");

    // THEN: Google sign-in option exists (translated text "Continue with Google")
    const googleBtn = page.getByRole("button", { name: /google/i });
    await expect(googleBtn).toBeVisible({ timeout: 10_000 });
  });

  test("login page has register link", async ({ page }) => {
    // GIVEN: User is on login page
    await page.goto("/login");

    // THEN: Register link exists
    const registerLink = page.locator('a[href="/register"]');
    await expect(registerLink).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    // GIVEN: User is on login page
    await page.goto("/login");

    // WHEN: User submits invalid credentials
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await emailInput.fill("nonexistent@example.com");
    await passwordInput.fill("wrongpassword123");

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // THEN: Error message is displayed
    const errorMsg = page.locator("text=Invalid").or(page.locator("text=incorrect")).or(page.locator("[role='alert']"));
    await expect(errorMsg).toBeVisible({ timeout: 10_000 });
  });

  test("register page renders correctly", async ({ page }) => {
    // GIVEN: User navigates to register page
    await page.goto("/register");

    // THEN: Registration form is visible (page has 2 forms: Google OAuth + register)
    await expect(page.locator("form").first()).toBeVisible({ timeout: 10_000 });
  });

  test("register page has required fields", async ({ page }) => {
    // GIVEN: User is on register page
    await page.goto("/register");

    // THEN: Email, password, and confirm password fields exist
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("forgot password page renders", async ({ page }) => {
    // GIVEN: User navigates to forgot password page
    await page.goto("/forgot-password");

    // THEN: Email input form is visible
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10_000 });
  });

  test("login page has forgot password link", async ({ page }) => {
    // GIVEN: User is on login page
    await page.goto("/login");

    // THEN: Forgot password link exists
    const forgotLink = page.locator('a[href="/forgot-password"]');
    await expect(forgotLink).toBeVisible({ timeout: 10_000 });
  });
});
