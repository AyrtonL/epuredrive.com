import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '..', '.playwright', 'auth.json');

setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_EMAIL ?? '';
  const password = process.env.TEST_PASSWORD ?? '';

  if (!email || !password) {
    setup.skip();
    return;
  }

  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill login form
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');

  await emailInput.click();
  await emailInput.fill(email);
  await passwordInput.click();
  await passwordInput.fill(password);

  // Submit
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(/dashboard/, { timeout: 20000 });
  await expect(page.locator('body')).toContainText(/Welcome|Dashboard|Overview/i);

  // Save auth state
  await page.context().storageState({ path: authFile });
});
