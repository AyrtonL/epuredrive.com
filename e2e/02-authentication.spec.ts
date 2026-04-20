import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('Login page loads with email and password fields', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('Login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="email"]').fill('invalid@test.com');
    await page.locator('input[type="password"]').fill('wrongpassword123');

    const submitBtn = page.getByRole('button', { name: /sign in|log in|submit/i });
    await submitBtn.click();

    // Should show error message
    const error = page.locator('[class*="error"], [role="alert"], [class*="red"], [class*="danger"]');
    await expect(error.first()).toBeVisible({ timeout: 5000 });
  });

  test('Login with empty fields shows validation', async ({ page }) => {
    await page.goto('/login');

    const submitBtn = page.getByRole('button', { name: /sign in|log in|submit/i });
    await submitBtn.click();

    // HTML5 validation or custom error
    const emailInput = page.locator('input[type="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBe(true);
  });

  test('Sign up page loads with company name, email, password fields', async ({ page }) => {
    await page.goto('/sign-up');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Company name field - use label text
    const companyField = page.getByLabel(/company/i);
    await expect(companyField).toBeVisible();

    // Submit button - "Create your fleet page"
    const submitBtn = page.getByRole('button', { name: /create|sign up|get started/i });
    await expect(submitBtn).toBeVisible();
  });

  test('Forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /reset|send|submit/i })).toBeVisible();
  });

  test('Login page has link to forgot password', async ({ page }) => {
    await page.goto('/login');

    const forgotLink = page.getByRole('link', { name: /forgot/i });
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();
    await expect(page).toHaveURL(/forgot-password/);
  });

  test('Protected dashboard redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/login|sign-in/, { timeout: 10000 });
    await expect(page).toHaveURL(/login|sign-in/);
  });

  test('Protected settings redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForURL(/login|sign-in/, { timeout: 10000 });
    await expect(page).toHaveURL(/login|sign-in/);
  });
});
