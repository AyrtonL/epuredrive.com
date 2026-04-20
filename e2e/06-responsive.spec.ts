import { test, expect } from '@playwright/test';

const TENANT_SLUG = 'sunshine-luxury';

test.describe('Responsive Design - Mobile (390px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Homepage renders without crash on mobile', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // CTA is visible
    const cta = page.getByRole('link', { name: /get started|sign in/i }).first();
    await expect(cta).toBeVisible();
  });

  test('Login form is usable on mobile', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Input should be reasonably wide
    const box = await emailInput.boundingBox();
    expect(box!.width).toBeGreaterThan(200);
  });

  test('Tenant fleet page renders on mobile', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/fleet`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/Our Fleet/i);
  });

  test('Car detail page renders on mobile', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/15`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/BMW|X5/i);
    await expect(page.locator('img').first()).toBeVisible();
  });
});

test.describe('Responsive Design - Tablet (768px)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('Homepage renders on tablet', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/fleet|online|minutes/i);
  });

  test('Fleet page renders on tablet', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/fleet`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/Our Fleet/i);
  });
});

test.describe('Responsive Design - Desktop (1440px)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Homepage renders full layout on desktop', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/fleet|online|minutes/i);

    // Navigation should show full links
    await expect(page.getByRole('link', { name: /features/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /demo/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /pricing/i }).first()).toBeVisible();
  });
});
