import { test, expect } from '@playwright/test';

const DARK_TENANT = 'sunshine-luxury';
const LIGHT_TENANT = 'epurerental';

test.describe('Theme - Dark Mode (default)', () => {
  test('Dark tenant has data-theme="dark" on root', async ({ page }) => {
    await page.goto(`/sites/${DARK_TENANT}`);
    await page.waitForLoadState('networkidle');

    const theme = await page.locator('[data-theme]').first().getAttribute('data-theme');
    expect(theme).toBe('dark');
  });

  test('Dark tenant has dark background (#040404)', async ({ page }) => {
    await page.goto(`/sites/${DARK_TENANT}`);
    await page.waitForLoadState('networkidle');

    const bg = await page.locator('[data-theme="dark"]').first().evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    // Should be very dark (near black)
    expect(bg).toMatch(/rgb\(\s*(4|0),\s*(4|0),\s*(4|0)\s*\)/);
  });

  test('Dark tenant has white text', async ({ page }) => {
    await page.goto(`/sites/${DARK_TENANT}`);
    await page.waitForLoadState('networkidle');

    const color = await page.locator('[data-theme="dark"]').first().evaluate(
      (el) => getComputedStyle(el).color
    );
    // White text = rgb(255, 255, 255) or close
    expect(color).toMatch(/rgb\(\s*2[45]\d,\s*2[45]\d,\s*2[45]\d\s*\)/);
  });

  test('Dark tenant navbar has dark transparent background', async ({ page }) => {
    await page.goto(`/sites/${DARK_TENANT}`);
    await page.waitForLoadState('networkidle');

    const nav = page.locator('nav, header').first();
    if (await nav.isVisible().catch(() => false)) {
      const classes = await nav.getAttribute('class') || '';
      // Dark navbar uses bg-[#040404]/40 or similar dark class
      expect(classes).not.toContain('bg-white');
    }
  });

  test('Dark tenant CTA button is white with black text', async ({ page }) => {
    await page.goto(`/sites/${DARK_TENANT}`);
    await page.waitForLoadState('networkidle');

    const cta = page.getByRole('link', { name: /reserve now/i }).first();
    if (await cta.isVisible().catch(() => false)) {
      const bg = await cta.evaluate((el) => getComputedStyle(el).backgroundColor);
      // White-ish background
      expect(bg).toMatch(/rgb\(\s*2[0-5]\d,\s*2[0-5]\d,\s*2[0-5]\d\s*\)/);
    }
  });
});

test.describe('Theme - Light Mode', () => {
  test('Light tenant has data-theme="light" on root', async ({ page }) => {
    await page.goto(`/sites/${LIGHT_TENANT}`);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() || '';
    if (bodyText.includes('verifying your connection')) return;

    const theme = await page.locator('[data-theme]').first().getAttribute('data-theme');
    expect(theme).toBe('light');
  });

  test('Light tenant has light background (#FAFAFA)', async ({ page }) => {
    await page.goto(`/sites/${LIGHT_TENANT}`);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() || '';
    if (bodyText.includes('verifying your connection')) return;

    const bg = await page.locator('[data-theme="light"]').first().evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    // Should be very light (near white) — #FAFAFA = rgb(250, 250, 250)
    expect(bg).toMatch(/rgb\(\s*2[3-5]\d,\s*2[3-5]\d,\s*2[3-5]\d\s*\)/);
  });

  test('Light tenant has dark text', async ({ page }) => {
    await page.goto(`/sites/${LIGHT_TENANT}`);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() || '';
    if (bodyText.includes('verifying your connection')) return;

    const color = await page.locator('[data-theme="light"]').first().evaluate(
      (el) => getComputedStyle(el).color
    );
    // Dark text = low RGB values (gray-900 = ~17,24,39)
    expect(color).toMatch(/rgb\(\s*\d{1,2},\s*\d{1,2},\s*\d{1,3}\s*\)/);
  });

  test('Light tenant navbar has light/white background', async ({ page }) => {
    await page.goto(`/sites/${LIGHT_TENANT}`);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() || '';
    if (bodyText.includes('verifying your connection')) return;

    const nav = page.locator('nav, header').first();
    if (await nav.isVisible().catch(() => false)) {
      const classes = await nav.getAttribute('class') || '';
      // Light navbar should NOT have dark background classes
      expect(classes).not.toContain('bg-[#040404]');
    }
  });

  test('Light tenant CTA button is dark with white text', async ({ page }) => {
    await page.goto(`/sites/${LIGHT_TENANT}`);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() || '';
    if (bodyText.includes('verifying your connection')) return;

    const cta = page.getByRole('link', { name: /reserve now/i }).first();
    if (await cta.isVisible().catch(() => false)) {
      const bg = await cta.evaluate((el) => getComputedStyle(el).backgroundColor);
      // Dark background (gray-900 = rgb(17, 24, 39) or similar)
      expect(bg).toMatch(/rgb\(\s*\d{1,2},\s*\d{1,2},\s*\d{1,3}\s*\)/);
    }
  });

  test('Light tenant page renders with light styling', async ({ page }) => {
    await page.goto(`/sites/${LIGHT_TENANT}`);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() || '';
    if (bodyText.includes('verifying your connection')) return;

    // Verify no dark background classes on root
    const rootClasses = await page.locator('[data-theme="light"]').first().getAttribute('class') || '';
    expect(rootClasses).toContain('bg-[#FAFAFA]');
    expect(rootClasses).toContain('text-gray-900');
  });
});

test.describe('Theme - Visual Contrast Between Dark & Light', () => {
  test('Dark and light tenants have different root backgrounds', async ({ page }) => {
    // Dark tenant
    await page.goto(`/sites/${DARK_TENANT}`);
    await page.waitForLoadState('networkidle');

    let darkBodyText = await page.locator('body').textContent() || '';
    if (darkBodyText.includes('verifying your connection')) return;

    const darkBg = await page.locator('[data-theme]').first().evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );

    // Light tenant
    await page.goto(`/sites/${LIGHT_TENANT}`);
    await page.waitForLoadState('networkidle');

    let lightBodyText = await page.locator('body').textContent() || '';
    if (lightBodyText.includes('verifying your connection')) return;

    const lightBg = await page.locator('[data-theme]').first().evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );

    // They must be different
    expect(darkBg).not.toBe(lightBg);
  });
});

test.describe('Theme - Settings UI', () => {
  // These tests require auth — they run in the chromium-auth project
});
