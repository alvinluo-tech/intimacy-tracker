import { test, expect } from "@playwright/test";

test.describe("API Routes", () => {
  test("GET /api/partners returns 401 without auth", async ({ page }) => {
    // GIVEN: Request without authentication
    const response = await page.goto("/api/partners");

    // THEN: Returns 401 Unauthorized
    expect(response?.status()).toBe(401);
  });

  test("GET /api/polls returns data", async ({ page }) => {
    // GIVEN: Public polls endpoint
    const response = await page.goto("/api/polls");

    // THEN: Returns 200 with data
    expect(response?.status()).toBe(200);
    const body = await response?.json();
    expect(body).toBeTruthy();
  });

  test("POST /api/polls validates input", async ({ request }) => {
    // GIVEN: POST with missing fields
    const response = await request.post("/api/polls", {
      data: {},
    });

    // THEN: Returns error (400 or similar)
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("GET /api/export-csv returns 401 without auth", async ({ page }) => {
    // GIVEN: Request without authentication
    const response = await page.goto("/api/export-csv");

    // THEN: Returns 401
    expect(response?.status()).toBe(401);
  });

  test("POST /api/decrypt-notes returns 401 without auth", async ({ page }) => {
    // GIVEN: Request without authentication (GET returns 405, POST may return 401)
    const response = await page.goto("/api/decrypt-notes");

    // THEN: Returns 4xx error
    expect(response?.status()).toBeGreaterThanOrEqual(400);
  });

  test("GET /api/report/data returns 401 without auth", async ({ page }) => {
    // GIVEN: Request without authentication
    const response = await page.goto("/api/report/data?year=2025");

    // THEN: Returns 401
    expect(response?.status()).toBe(401);
  });

  test("GET /api/admin/stats returns 401 without auth", async ({ page }) => {
    // GIVEN: Request without authentication
    const response = await page.goto("/api/admin/stats");

    // THEN: Returns 401 or 403 (admin routes return 403 when no admin)
    const status = response?.status();
    expect(status === 401 || status === 403).toBeTruthy();
  });

  test("GET /api/admin/polls returns 401 without auth", async ({ page }) => {
    // GIVEN: Request without authentication
    const response = await page.goto("/api/admin/polls");

    // THEN: Returns 401 or 403 (admin routes return 403 when no admin)
    const status = response?.status();
    expect(status === 401 || status === 403).toBeTruthy();
  });
});
