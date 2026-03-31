// e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
const TEST_EMAIL = process.env.TEST_EMAIL ?? ''
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? ''

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login via the sign-in page
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/dashboard`)
  })

  test('Overview page loads with stat cards', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Welcome')
    await expect(page.locator('text=Bookings →')).toBeVisible()
    await expect(page.locator('text=Fleet →')).toBeVisible()
  })

  test('Sidebar shows grouped navigation', async ({ page }) => {
    await expect(page.locator('text=Operations')).toBeVisible()
    await expect(page.locator('text=Finance')).toBeVisible()
    await expect(page.locator('text=Clients')).toBeVisible()
  })

  test('Bookings page renders table', async ({ page }) => {
    await page.click('text=Operations')
    await page.click('text=Bookings')
    await page.waitForURL(`${BASE_URL}/dashboard/bookings`)
    await expect(page.locator('h1')).toContainText('Bookings')
  })

  test('Fleet page renders car list', async ({ page }) => {
    await page.click('text=Operations')
    await page.click('text=Fleet')
    await page.waitForURL(`${BASE_URL}/dashboard/fleet`)
    await expect(page.locator('h1')).toContainText('Fleet')
  })
})
