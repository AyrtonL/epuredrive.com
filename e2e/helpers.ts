import { Page } from '@playwright/test';

/**
 * Navigate to a page and handle Netlify bot protection challenge.
 * If the challenge page appears, wait for it to resolve (up to 10s),
 * then retry the navigation.
 */
export async function safeGoto(page: Page, url: string, options?: { timeout?: number }) {
  await page.goto(url);
  await page.waitForLoadState('networkidle');

  // Check if Netlify bot challenge intercepted — wait up to 8s for it to resolve
  for (let i = 0; i < 4; i++) {
    const bodyText = await page.locator('body').textContent({ timeout: 3000 }).catch(() => '');
    if (!bodyText?.includes('verifying your connection')) break;
    await page.waitForTimeout(2000);
  }

  // Dismiss cookie consent banner if present (blocks clicks on underlying elements)
  await dismissCookieBanner(page);
}

/**
 * Dismiss cookie consent banner if visible.
 */
export async function dismissCookieBanner(page: Page) {
  const acceptBtn = page.locator('button:has-text("Accept"), button:has-text("ACCEPT"), button:has-text("Accept All")').first();
  if (await acceptBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await acceptBtn.click();
    await page.waitForTimeout(300);
  }
}

/**
 * Check if page is blocked by Netlify bot protection.
 * Use to skip assertions when challenge page appears.
 */
export async function isBotBlocked(page: Page): Promise<boolean> {
  const bodyText = await page.locator('body').textContent({ timeout: 2000 }).catch(() => '');
  return bodyText?.includes('verifying your connection') ?? false;
}
