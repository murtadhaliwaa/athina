import { test, expect } from "@playwright/test";

/**
 * دخان آلي. السيناريوهات الكاملة §18.2 تُنفَّذ يدوياً من docs/PRE-DELIVERY.md
 * (تحتاج حسابات وشفت وجهازين).
 */

test.describe("واجهة عامة", () => {
  test("صفحة الدخول عربية وRTL", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("lang", /ar/i);
    await expect(page.locator("html")).toHaveAttribute("dir", /rtl/i);
    await expect(page.getByRole("button", { name: /دخول/i }).first()).toBeVisible();
  });

  test("manifest PWA متاح", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.display).toBe("standalone");
    expect(body.dir).toBe("rtl");
    expect(Array.isArray(body.icons)).toBeTruthy();
    expect(body.icons.length).toBeGreaterThan(0);
  });

  test("مسار محمي يوجّه لتسجيل الدخول", async ({ page }) => {
    await page.goto("/waiter");
    await expect(page).toHaveURL(/login/);
  });

  test("مسار الكاشير محمي", async ({ page }) => {
    await page.goto("/cashier");
    await expect(page).toHaveURL(/login/);
  });

  test("مسار المالك محمي", async ({ page }) => {
    await page.goto("/owner");
    await expect(page).toHaveURL(/login/);
  });
});
