import { test, expect } from '@playwright/test'

const slug = 'sunshine-luxury'

test.describe('Fleet listing page', () => {
  test('renders hero section and fleet page title', async ({ page }) => {
    await page.goto(`/sites/${slug}`)
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('renders the nav bar', async ({ page }) => {
    await page.goto(`/sites/${slug}`)
    const nav = page.locator('nav, header')
    await expect(nav.first()).toBeVisible()
  })

  test('renders search input on fleet page', async ({ page }) => {
    await page.goto(`/sites/${slug}/fleet`)
    await page.waitForLoadState('networkidle')
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]')
    await expect(searchInput.first()).toBeVisible()
  })

  test('search input accepts text', async ({ page }) => {
    await page.goto(`/sites/${slug}/fleet`)
    await page.waitForLoadState('networkidle')
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first()
    await searchInput.fill('BMW')
    const value = await searchInput.inputValue()
    expect(value).toBe('BMW')
  })
})

test.describe('Car detail page', () => {
  test('shows car detail with specs', async ({ page }) => {
    await page.goto(`/sites/${slug}/15`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(/BMW|X5/i)
  })

  test('car detail shows back link', async ({ page }) => {
    await page.goto(`/sites/${slug}/15`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(/Back to fleet/i)
  })

  test('car detail shows booking CTA', async ({ page }) => {
    await page.goto(`/sites/${slug}/15`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').textContent() || ''
    // Skip if bot challenge
    if (bodyText.includes('verifying your connection')) return
    expect(bodyText).toMatch(/Reserve This Vehicle|WhatsApp|Book|Inquire/i)
  })
})
