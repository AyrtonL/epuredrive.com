import { Page, expect } from '@playwright/test';

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
}

/**
 * Check if page is blocked by Netlify bot protection.
 * Use to skip assertions when challenge page appears.
 */
export async function isBotBlocked(page: Page): Promise<boolean> {
  const bodyText = await page.locator('body').textContent({ timeout: 2000 }).catch(() => '');
  return bodyText?.includes('verifying your connection') ?? false;
}
