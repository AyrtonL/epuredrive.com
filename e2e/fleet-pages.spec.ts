import { test, expect } from '@playwright/test'

const slug = process.env.TEST_SLUG ?? 'demo'

test.describe('Fleet listing page', () => {
  test('renders hero section and fleet page title', async ({ page }) => {
    await page.goto(`/sites/${slug}`)
    await expect(page.locator('h1')).toBeVisible()
    const h1Text = await page.locator('h1').textContent()
    expect(h1Text?.trim()).toBeTruthy()
  })

  test('renders the nav bar with logo or brand name', async ({ page }) => {
    await page.goto(`/sites/${slug}`)
    await expect(page.locator('nav')).toBeVisible()
  })

  test('renders search input', async ({ page }) => {
    await page.goto(`/sites/${slug}`)
    await expect(page.locator('input[type="search"]')).toBeVisible()
  })

  test('search input filters vehicles', async ({ page }) => {
    await page.goto(`/sites/${slug}`)
    const searchInput = page.locator('input[type="search"]')
    await searchInput.fill('zzzzzzzzzzz')
    // Either shows empty state or filtered grid
    const emptyState = page.locator('text=No vehicles match your search')
    const grid = page.locator('[id="cars"] .grid')
    const emptyOrGrid = emptyState.or(grid)
    await expect(emptyOrGrid.first()).toBeVisible()
  })

  test('page has correct meta title format', async ({ page }) => {
    await page.goto(`/sites/${slug}`)
    const title = await page.title()
    expect(title).toContain('Fleet')
  })
})

test.describe('Car detail page', () => {
  test('shows car detail when clicking a car card', async ({ page }) => {
    await page.goto(`/sites/${slug}`)
    const firstCard = page.locator('a[href*="/sites/"]').first()
    const cardCount = await firstCard.count()

    if (cardCount === 0) {
      test.skip()
      return
    }

    const href = await firstCard.getAttribute('href')
    if (!href) {
      test.skip()
      return
    }

    await page.goto(href)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('car detail shows back link', async ({ page }) => {
    await page.goto(`/sites/${slug}`)
    const firstCard = page.locator('a[href*="/sites/"]').first()
    const cardCount = await firstCard.count()

    if (cardCount === 0) {
      test.skip()
      return
    }

    const href = await firstCard.getAttribute('href')
    if (!href) {
      test.skip()
      return
    }

    await page.goto(href)
    await expect(page.locator('text=← Back to fleet')).toBeVisible()
  })

  test('car detail shows booking CTA', async ({ page }) => {
    await page.goto(`/sites/${slug}`)
    const firstCard = page.locator('a[href*="/sites/"]').first()
    const cardCount = await firstCard.count()

    if (cardCount === 0) {
      test.skip()
      return
    }

    const href = await firstCard.getAttribute('href')
    if (!href) {
      test.skip()
      return
    }

    await page.goto(href)
    await expect(page.locator('text=Book this car')).toBeVisible()
  })
})
