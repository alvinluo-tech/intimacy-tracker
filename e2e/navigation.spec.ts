import { test, expect } from "@playwright/test";

test.describe("Public Pages", () => {
  const publicPages = [
    { path: "/login", name: "Login" },
    { path: "/register", name: "Register" },
    { path: "/forgot-password", name: "Forgot Password" },
    { path: "/privacy-policy", name: "Privacy Policy" },
    { path: "/terms-of-service", name: "Terms of Service" },
  ];

  for (const { path, name } of publicPages) {
    test(`${name} page loads without errors`, async ({ page }) => {
      // GIVEN: User navigates to public page
      const response = await page.goto(path);

      // THEN: Page loads successfully (no 500 errors)
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("body")).toBeVisible();
    });
  }
});

test.describe("Protected Routes Redirect", () => {
  const protectedRoutes = [
    "/dashboard",
    "/settings",
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated users to login`, async ({ page }) => {
      // GIVEN: Unauthenticated user tries to access protected route
      await page.goto(route);

      // THEN: Redirected to login page
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    });
  }
});

test.describe("Auth Callback", () => {
  test("auth callback handles invalid code gracefully", async ({ page }) => {
    // GIVEN: User visits auth callback with invalid code
    const response = await page.goto("/auth/callback?code=invalid&next=/dashboard");

    // THEN: Does not crash (may redirect or show error)
    expect(response?.status()).toBeLessThan(500);
  });
});
