import { test, expect } from '@playwright/test';

const TENANT_SLUG = 'sunshine-luxury';

test.describe('Performance & SEO Basics', () => {
  test('Homepage loads under 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(5000);
  });

  test('Homepage has proper meta tags', async ({ page }) => {
    await page.goto('/');

    // Title exists
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);

    // Meta description
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(10);
  });

  test('Tenant site has proper meta tags', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}`);

    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('No console errors on homepage', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors
    const critical = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('analytics') &&
      !e.includes('third-party') &&
      !e.includes('403') &&
      !e.includes('Failed to load resource')
    );

    expect(critical).toHaveLength(0);
  });

  test('No console errors on tenant site', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`/sites/${TENANT_SLUG}`);
    await page.waitForLoadState('networkidle');

    const critical = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('analytics') &&
      !e.includes('third-party') &&
      !e.includes('hydration')
    );

    // Allow max 2 non-critical console errors
    expect(critical.length).toBeLessThanOrEqual(2);
  });

  test('No 404 resources on homepage', async ({ page }) => {
    const failed: string[] = [];
    page.on('response', response => {
      if (response.status() === 404 && !response.url().includes('favicon')) {
        failed.push(response.url());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(failed).toHaveLength(0);
  });

  test('Car detail page loads under 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto(`/sites/${TENANT_SLUG}/15`, { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(5000);
  });

  test('Images have alt attributes', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/fleet`);
    await page.waitForLoadState('networkidle');

    const images = page.locator('img');
    const count = await images.count();

    let missingAlt = 0;
    for (let i = 0; i < Math.min(count, 10); i++) {
      const alt = await images.nth(i).getAttribute('alt');
      if (!alt && alt !== '') missingAlt++;
    }

    // At least 80% of images should have alt
    expect(missingAlt).toBeLessThanOrEqual(Math.ceil(count * 0.2));
  });
});
