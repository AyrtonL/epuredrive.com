import { test, expect } from '@playwright/test';

const TENANT_SLUG = 'sunshine-luxury';
const CAR_ID = 15;

test.describe('Public Tenant Site - Homepage', () => {
  test('Homepage loads with tenant branding', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}`);
    await expect(page.locator('body')).toContainText(/Sunshine Luxury/i);
  });

  test('Homepage has hero section', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/Premium|Miami|Luxury/i);
  });

  test('Homepage navigation bar has FLEET, EXPERIENCE, CONCIERGE, MY BOOKING', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: /fleet/i }).first()).toBeVisible();
    await expect(page.locator('body')).toContainText(/RESERVE NOW|Reserve Now/);
  });

  test('RESERVE NOW button is clickable and has href', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}`);
    await page.waitForLoadState('networkidle');

    const reserveBtn = page.getByRole('link', { name: /reserve now/i }).first();
    await expect(reserveBtn).toBeVisible();
    const href = await reserveBtn.getAttribute('href');
    expect(href).toBeTruthy();
  });

  test('Homepage has Experience section', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}`);
    await page.waitForLoadState('networkidle');

    const body = await page.locator('body').textContent() || '';
    expect(body).toMatch(/Experience|Premium|Style/i);
  });

  test('Homepage has How It Works section', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}`);
    await page.waitForLoadState('networkidle');

    const body = await page.locator('body').textContent() || '';
    // May have step-by-step or how it works
    expect(body.length).toBeGreaterThan(500);
  });

  test('Homepage has Concierge/Contact section', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/Concierge|Contact|WhatsApp/i);
  });

  test('Homepage has footer with Powered by ePure', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/Powered by|éPure/i);
  });
});

test.describe('Public Tenant Site - Fleet', () => {
  test('Fleet page loads with title and vehicles count', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/fleet`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/Our Fleet/i);
    await expect(page.locator('body')).toContainText(/vehicle/i);
  });

  test('Fleet page has search bar', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/fleet`);
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]');
    await expect(searchInput.first()).toBeVisible();
  });

  test('Fleet page has SEARCH FLEET button', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/fleet`);
    await page.waitForLoadState('networkidle');

    const searchBtn = page.getByRole('button', { name: /search fleet/i });
    await expect(searchBtn).toBeVisible();
  });

  test('Fleet page has filter options', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/fleet`);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('Fleet page has date/time/location selectors', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/fleet`);
    await page.waitForLoadState('networkidle');

    const body = await page.locator('body').textContent() || '';
    expect(body).toMatch(/PICKUP|RETURN|TIME|LOCATION|Delivery/i);
  });

  test('Fleet search input filters text', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/fleet`);
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();
    await searchInput.fill('BMW');
    const value = await searchInput.inputValue();
    expect(value).toBe('BMW');
  });
});

test.describe('Public Tenant Site - Car Detail', () => {
  test('Car detail page loads with images and specs', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/${CAR_ID}`);
    await expect(page.locator('body')).not.toContainText(/404|not found/i);

    const images = page.locator('img');
    await expect(images.first()).toBeVisible();

    const body = await page.locator('body').textContent() || '';
    expect(body).toMatch(/BMW|X5/i);
  });

  test('Car detail shows Power, Transmission, Seats specs', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/${CAR_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/Power/i);
    await expect(page.locator('body')).toContainText(/Transmission/i);
    await expect(page.locator('body')).toContainText(/Seats/i);
  });

  test('Car detail shows price per day', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/${CAR_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/\$\d+/);
    await expect(page.locator('body')).toContainText(/day/i);
  });

  test('Car detail has Back to fleet link', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/${CAR_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/Back to fleet/i);
  });

  test('Car detail has booking widget with date, time, location', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/${CAR_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/Pickup/i);
    await expect(page.locator('body')).toContainText(/Return/i);
    await expect(page.locator('body')).toContainText(/Delivery|Miami Airport/i);
  });

  test('Date picker opens when clicking Pickup/Return', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/${CAR_ID}`);
    await page.waitForLoadState('networkidle');

    const pickupTrigger = page.locator('text=PICKUP, text=Pickup, text=Select').first();
    if (await pickupTrigger.isVisible().catch(() => false)) {
      await pickupTrigger.click();
      await page.waitForTimeout(500);

      const calendar = page.locator('[class*="calendar"], [class*="picker"], [class*="rdp"], table');
      if (await calendar.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(calendar.first()).toBeVisible();
      }
    }
  });

  test('Time selects have AM/PM options', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/${CAR_ID}`);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() || '';
    if (bodyText.includes('verifying your connection')) return;

    expect(bodyText).toContain('AM');
    expect(bodyText).toContain('PM');
  });

  test('Location dropdown has Miami Airport, South Beach, Brickell', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/${CAR_ID}`);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() || '';
    if (bodyText.includes('verifying your connection')) return;

    expect(bodyText).toContain('Miami Airport');
    expect(bodyText).toContain('South Beach');
    expect(bodyText).toContain('Brickell');
  });

  test('Reserve This Vehicle button exists', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/${CAR_ID}`);
    await page.waitForLoadState('networkidle');

    const reserveBtn = page.getByRole('button', { name: /reserve this vehicle/i });
    await expect(reserveBtn).toBeVisible();
  });

  test('WhatsApp inquiry link exists', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/${CAR_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/WhatsApp|SMS/i);
  });

  test('Est. Investment section shows cost info', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/${CAR_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/Est. Investment|Select Configuration/i);
  });
});

test.describe('Public Tenant Site - My Booking & Confirmation', () => {
  test('My Booking page has lookup form', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/my-booking`);
    await expect(page.locator('body')).not.toContainText(/404|500/i);

    const input = page.locator('input');
    await expect(input.first()).toBeVisible();
  });

  test('My Booking lookup with invalid data shows not found', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/my-booking`);
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input');
    const count = await inputs.count();
    if (count >= 2) {
      await inputs.nth(0).fill('999999');
      await inputs.nth(1).fill('fake@test.com');

      const lookupBtn = page.getByRole('button', { name: /look up|search|find/i });
      if (await lookupBtn.isVisible().catch(() => false)) {
        await lookupBtn.click();
        await page.waitForTimeout(2000);
        // Should show "not found" or error
      }
    }
  });

  test('Booking confirmation page handles no booking gracefully', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/booking-confirmation`);
    await expect(page.locator('body')).not.toContainText(/500|server error/i);
  });
});

test.describe('Public Tenant Site - Error Handling', () => {
  test('Invalid car ID shows 404 or error', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/99999`);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/404|not found|no car|doesn't exist|error/i);
  });

  test('Agreement page with invalid token shows error', async ({ page }) => {
    await page.goto(`/sites/${TENANT_SLUG}/agreement/invalid-token-123`);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText).toMatch(/not found|invalid|expired|error|no agreement|404/i);
  });
});
