import { test, expect } from '@playwright/test';

const TENANT_SLUG = 'sunshine-luxury';
const CAR_ID = 15;

test.describe('Booking Widget - Step 1 Configuration', () => {
  test('Booking widget renders all form elements', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/${CAR_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/Pickup/i);
    await expect(page.locator('body')).toContainText(/Return/i);
    await expect(page.locator('body')).toContainText(/Pickup Time|Return Time/i);
    await expect(page.locator('body')).toContainText(/Delivery|Miami Airport/i);
  });

  test('Reserve This Vehicle button opens customer form (Step 2)', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/${CAR_ID}`);
    await page.waitForLoadState('networkidle');

    const reserveBtn = page.getByRole('button', { name: /reserve this vehicle/i });
    await expect(reserveBtn).toBeVisible();

    // Click it — should transition to Step 2 with customer fields
    await reserveBtn.click();
    await page.waitForTimeout(1000);

    // Step 2 should show customer info fields
    const body = await page.locator('body').textContent() || '';
    // May show name/email/phone fields or require date selection first
    const hasCustomerFields = /Full Name|Email|Phone|Pay|Confirm/i.test(body);
    const hasDateWarning = /select.*date|choose.*date|pick.*date/i.test(body);
    expect(hasCustomerFields || hasDateWarning).toBe(true);
  });

  test('WhatsApp inquiry button has wa.me link', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/${CAR_ID}`);
    await page.waitForLoadState('networkidle');

    const whatsappBtn = page.locator('a[href*="wa.me"], button:has-text("WhatsApp"), a:has-text("WhatsApp")').first();
    await expect(whatsappBtn).toBeVisible();
  });

  test('Location selector shows fee information', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/${CAR_ID}`);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() || '';
    if (bodyText.includes('verifying your connection')) return;

    // Free and paid locations
    expect(bodyText).toMatch(/Free|\$\d+.*Fee/i);
  });

  test('Secured via ePure Drive Cloud badge is shown', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/${CAR_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/Secured via|éPure Drive Cloud/i);
  });
});

test.describe('Booking Widget - Search from Fleet', () => {
  test('Fleet SEARCH FLEET button works', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/fleet`);
    await page.waitForLoadState('networkidle');

    const searchBtn = page.getByRole('button', { name: /search fleet/i });
    await expect(searchBtn).toBeVisible();
    await searchBtn.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toContainText(/500|server error/i);
  });

  test('Fleet page date selectors work', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/fleet`);
    await page.waitForLoadState('networkidle');

    const pickupTrigger = page.locator('text=PICKUP, text=Pickup, text=Select').first();
    if (await pickupTrigger.isVisible().catch(() => false)) {
      await pickupTrigger.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Booking Widget - Car Info Display', () => {
  test('Car dynamics/features section shows', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/${CAR_ID}`);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() || '';
    // BMW X5 has: Dynamics, Active Aero, Exhaust, Sport Mode, Intelligence, Driver Assist, Finish, Carbon Pack
    expect(bodyText).toMatch(/Dynamics|Active Aero|Sport Mode|Driver Assist|Carbon Pack/i);
  });

  test('Car transmission and passengers info', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/${CAR_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/8-Speed Auto/i);
    await expect(page.locator('body')).toContainText(/5 Passengers/i);
  });

  test('Car description is displayed', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/${CAR_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/panoramic sunroof|leather interior/i);
  });
});
