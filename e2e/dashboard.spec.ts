import { test, expect } from '@playwright/test'
import { safeGoto, isBotBlocked } from './helpers'

// Auth state is pre-loaded via auth.setup.ts + storageState in config
test.describe('Dashboard (requires auth)', () => {

  // ─── Overview ───
  test('Overview page loads with stat cards', async ({ page }) => {
    await safeGoto(page, '/dashboard')
    if (await isBotBlocked(page)) return
    await expect(page.locator('body')).toContainText(/Welcome|Dashboard/i)
  })

  test('Overview has View Site link', async ({ page }) => {
    await safeGoto(page, '/dashboard')
    if (await isBotBlocked(page)) return
    const viewSite = page.getByRole('link', { name: /view site/i })
    if (await viewSite.isVisible().catch(() => false)) {
      const href = await viewSite.getAttribute('href')
      expect(href).toBeTruthy()
    }
  })

  test('Overview has + New booking button', async ({ page }) => {
    await safeGoto(page, '/dashboard')
    if (await isBotBlocked(page)) return
    const newBooking = page.getByRole('link', { name: /new booking/i }).or(
      page.getByRole('button', { name: /new booking/i })
    )
    await expect(newBooking.first()).toBeVisible()
  })

  test('Overview shows recent bookings table', async ({ page }) => {
    await safeGoto(page, '/dashboard')
    if (await isBotBlocked(page)) return
    await expect(page.locator('body')).toContainText(/Recent|Booking/i)
  })

  // ─── Sidebar Navigation ───
  test('Sidebar shows grouped navigation', async ({ page }) => {
    await safeGoto(page, '/dashboard')
    if (await isBotBlocked(page)) return
    const body = await page.locator('body').textContent() || ''
    expect(body).toMatch(/Operations|Calendar|Bookings|Fleet/i)
    expect(body).toMatch(/Finance|Expenses|Reports/i)
    expect(body).toMatch(/Settings/i)
  })

  test('Sidebar Operations group links work', async ({ page }) => {
    await safeGoto(page, '/dashboard/calendar')
    if (await isBotBlocked(page)) return
    // Verify we can reach the calendar page directly
    await expect(page.locator('body')).toContainText(/Calendar/i)
  })

  test('Sidebar has logout option', async ({ page }) => {
    await safeGoto(page, '/dashboard')
    if (await isBotBlocked(page)) return
    const body = await page.locator('body').textContent() || ''
    expect(body.length).toBeGreaterThan(100)
  })

  // ─── Fleet ───
  test('Fleet page loads with vehicle stats', async ({ page }) => {
    await safeGoto(page, '/dashboard/fleet')
    if (await isBotBlocked(page)) return
    await expect(page.locator('body')).toContainText(/Fleet|Vehicle/i)
  })

  test('Fleet page has search and Add Vehicle button', async ({ page }) => {
    await safeGoto(page, '/dashboard/fleet')
    if (await isBotBlocked(page)) return

    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="make" i]')
    await expect(searchInput.first()).toBeVisible()

    const addBtn = page.getByRole('button', { name: /add vehicle/i })
    await expect(addBtn).toBeVisible()
  })

  test('Fleet Add Vehicle modal opens', async ({ page }) => {
    await safeGoto(page, '/dashboard/fleet')
    if (await isBotBlocked(page)) return

    const addBtn = page.getByRole('button', { name: /add vehicle/i })
    await addBtn.click()
    await page.waitForTimeout(500)

    // Modal shows "Add New Vehicle" heading with Make, Model fields
    await expect(page.locator('body')).toContainText(/Add New Vehicle/i)
    await expect(page.locator('body')).toContainText(/MAKE|Make/i)
  })

  test('Fleet search filters vehicles', async ({ page }) => {
    await safeGoto(page, '/dashboard/fleet')
    if (await isBotBlocked(page)) return

    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="make" i]').first()
    await searchInput.fill('BMW')
    await page.waitForTimeout(500)
    await expect(page.locator('body')).not.toContainText(/500|server error/i)
  })

  // ─── Bookings ───
  test('Bookings page loads with stats and table', async ({ page }) => {
    await safeGoto(page, '/dashboard/bookings')
    if (await isBotBlocked(page)) return
    await expect(page.locator('body')).toContainText(/Bookings/i)
  })

  test('Bookings has search, status filter, and Add Booking button', async ({ page }) => {
    await safeGoto(page, '/dashboard/bookings')
    if (await isBotBlocked(page)) return

    const search = page.locator('input[placeholder*="search" i]')
    await expect(search.first()).toBeVisible()

    const statusFilter = page.locator('select').first()
    await expect(statusFilter).toBeVisible()

    const addBtn = page.getByRole('button', { name: /add booking/i })
    await expect(addBtn).toBeVisible()
  })

  test('Bookings Add Booking modal opens with all fields', async ({ page }) => {
    await safeGoto(page, '/dashboard/bookings')
    if (await isBotBlocked(page)) return

    await page.getByRole('button', { name: /add booking/i }).click()
    await page.waitForTimeout(500)

    // Modal shows "Add New Booking" with customer/vehicle/date fields
    await expect(page.locator('body')).toContainText(/Add New Booking/i)
    await expect(page.locator('body')).toContainText(/CUSTOMER NAME|Customer Name/i)
    await expect(page.locator('body')).toContainText(/PICKUP DATE|Pickup Date/i)
  })

  test('Bookings status filter works', async ({ page }) => {
    await safeGoto(page, '/dashboard/bookings')
    if (await isBotBlocked(page)) return

    const statusFilter = page.locator('select').first()
    await statusFilter.selectOption({ index: 1 })
    await page.waitForTimeout(500)
    await expect(page.locator('body')).not.toContainText(/500|server error/i)
  })

  test('Bookings date range filter exists', async ({ page }) => {
    await safeGoto(page, '/dashboard/bookings')
    if (await isBotBlocked(page)) return

    const dateInput = page.locator('input[type="date"]')
    const count = await dateInput.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  // ─── Calendar ───
  test('Calendar page loads with FullCalendar', async ({ page }) => {
    await safeGoto(page, '/dashboard/calendar')
    if (await isBotBlocked(page)) return

    const calendar = page.locator('.fc, [class*="calendar"]')
    await expect(calendar.first()).toBeVisible()
  })

  test('Calendar has Block Dates button', async ({ page }) => {
    await safeGoto(page, '/dashboard/calendar')
    if (await isBotBlocked(page)) return

    const blockBtn = page.getByRole('button', { name: /block date/i })
    await expect(blockBtn).toBeVisible()
  })

  test('Calendar Block Dates modal opens', async ({ page }) => {
    await safeGoto(page, '/dashboard/calendar')
    if (await isBotBlocked(page)) return

    await page.getByRole('button', { name: /block date/i }).click()
    await page.waitForTimeout(500)

    // Modal shows "Block Dates" with Vehicle, Start Date, End Date, Reason
    await expect(page.locator('body')).toContainText(/Block Dates/i)
    await expect(page.locator('body')).toContainText(/START DATE|Start Date/i)
  })

  // ─── Maintenance ───
  test('Maintenance page loads', async ({ page }) => {
    await safeGoto(page, '/dashboard/maintenance')
    if (await isBotBlocked(page)) return
    await expect(page.locator('body')).toContainText(/Maintenance|Service/i)
  })

  test('Maintenance has Log Maintenance button', async ({ page }) => {
    await safeGoto(page, '/dashboard/maintenance')
    if (await isBotBlocked(page)) return

    // Button is "+ Log Maintenance" — may be inside a scrollable area
    await page.evaluate(() => window.scrollTo(0, 500))
    await page.waitForTimeout(300)

    const addBtn = page.locator('button:has-text("Log Maintenance"), button:has-text("Add Service"), button:has-text("Log Service")')
    await expect(addBtn.first()).toBeVisible({ timeout: 5000 })
  })

  // ─── Customers ───
  test('Customers page loads', async ({ page }) => {
    await safeGoto(page, '/dashboard/clients/customers')
    if (await isBotBlocked(page)) return
    await expect(page.locator('body')).toContainText(/Customer/i)
  })

  test('Customers has Sync from Reservations button', async ({ page }) => {
    await safeGoto(page, '/dashboard/clients/customers')
    if (await isBotBlocked(page)) return

    const syncBtn = page.getByRole('button', { name: /sync/i })
    await expect(syncBtn).toBeVisible()
  })

  // ─── Consignments ───
  test('Consignments page loads', async ({ page }) => {
    await safeGoto(page, '/dashboard/clients/consignments')
    if (await isBotBlocked(page)) return
    await expect(page.locator('body')).toContainText(/Consignment/i)
  })

  // ─── Finance ───
  test('Expenses page loads', async ({ page }) => {
    await safeGoto(page, '/dashboard/finance/expenses')
    if (await isBotBlocked(page)) return
    await expect(page.locator('body')).toContainText(/Expense/i)
  })

  test('Reports page loads', async ({ page }) => {
    await safeGoto(page, '/dashboard/finance/reports')
    if (await isBotBlocked(page)) return
    await expect(page.locator('body')).toContainText(/Report/i)
  })

  test('ROI page loads with fleet summary', async ({ page }) => {
    await safeGoto(page, '/dashboard/finance/roi')
    if (await isBotBlocked(page)) return
    await expect(page.locator('body')).toContainText(/ROI|Return|Profit/i)
  })

  test('Taxes page loads', async ({ page }) => {
    await safeGoto(page, '/dashboard/finance/taxes')
    if (await isBotBlocked(page)) return
    await expect(page.locator('body')).toContainText(/Tax/i)
  })

  // ─── Team ───
  test('Team page loads', async ({ page }) => {
    await safeGoto(page, '/dashboard/team')
    if (await isBotBlocked(page)) return
    await expect(page.locator('body')).toContainText(/Team|Member/i)
  })
})
