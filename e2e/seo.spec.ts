import { test, expect } from "@playwright/test";

test.describe("SEO & Meta", () => {
  test("landing page has proper title", async ({ page }) => {
    // GIVEN: User visits landing page
    await page.goto("/");

    // THEN: Title is set
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("landing page has meta description", async ({ page }) => {
    // GIVEN: User visits landing page
    await page.goto("/");

    // THEN: Meta description exists
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute("content", /.+/);
  });

  test("login page has proper title", async ({ page }) => {
    // GIVEN: User visits login page
    await page.goto("/login");

    // THEN: Title is set
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("landing page has viewport meta tag", async ({ page }) => {
    // GIVEN: User visits landing page
    await page.goto("/");

    // THEN: Viewport meta tag exists (use toHaveAttribute, meta tags are never "visible")
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute("content", /.+/);
  });
});

test.describe("Accessibility", () => {
  test("landing page has lang attribute", async ({ page }) => {
    // GIVEN: User visits landing page
    await page.goto("/");

    // THEN: HTML has lang attribute
    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", /.+/);
  });

  test("landing page has header and footer landmarks", async ({ page }) => {
    // GIVEN: User visits landing page
    await page.goto("/");

    // THEN: Has semantic landmarks (header and footer rendered by Nav and Footer components)
    await expect(page.locator("header")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("footer")).toBeVisible({ timeout: 10_000 });
  });

  test("login form has accessible labels", async ({ page }) => {
    // GIVEN: User visits login page
    await page.goto("/login");

    // THEN: Visible form inputs have labels or aria-labels
    // (Skip hidden inputs like honeypot fields)
    const inputs = page.locator("input:visible");
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const hasLabel = await input.evaluate((el) => {
        const id = el.id;
        const hasLabelEl = id ? !!document.querySelector(`label[for="${id}"]`) : false;
        const hasAriaLabel = !!el.getAttribute("aria-label");
        const hasAriaLabelledBy = !!el.getAttribute("aria-labelledby");
        const hasTitle = !!el.getAttribute("title");
        return hasLabelEl || hasAriaLabel || hasAriaLabelledBy || hasTitle;
      });
      expect(hasLabel).toBeTruthy();
    }
  });
});
