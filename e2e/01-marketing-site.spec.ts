import { test, expect } from '@playwright/test';

test.describe('Marketing Site - Public Pages', () => {
  test('Homepage loads with hero and CTA', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Hero text
    await expect(page.locator('body')).toContainText(/fleet|online|minutes/i);

    // CTA button - "Get started free"
    const cta = page.getByRole('link', { name: /get started|sign up|start/i }).first();
    await expect(cta).toBeVisible({ timeout: 10000 });
  });

  test('Features page loads', async ({ page }) => {
    await page.goto('/features');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('FAQ page loads', async ({ page }) => {
    await page.goto('/faq');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('Demo page loads', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('Privacy policy page loads', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.locator('body')).toContainText(/privacy|data|information/i);
  });

  test('Terms of service page loads', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('Cookie policy page loads', async ({ page }) => {
    await page.goto('/cookies');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('Cookie consent banner appears', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');

    // Cookie banner with ACCEPT/DECLINE buttons
    const acceptBtn = page.getByRole('button', { name: /accept/i }).first();
    if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('Navigation has Sign in and Get started links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /get started/i }).first()).toBeVisible();
  });

  test('No broken images on homepage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < Math.min(count, 20); i++) {
      const img = images.nth(i);
      if (await img.isVisible().catch(() => false)) {
        const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
        const src = await img.getAttribute('src');
        if (src && !src.startsWith('data:')) {
          expect(naturalWidth, `Image ${src} should load`).toBeGreaterThan(0);
        }
      }
    }
  });
});
