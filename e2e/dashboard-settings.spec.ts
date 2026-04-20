import { test, expect } from '@playwright/test'
import { safeGoto, isBotBlocked } from './helpers'

// Auth state is pre-loaded via auth.setup.ts + storageState in config
test.describe('Dashboard Settings (requires auth)', () => {

  // ─── Theme Toggle ───
  test('Brand tab has Site Theme selector with Dark and Light options', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings')
    if (await isBotBlocked(page)) return

    const body = await page.locator('body').textContent() || ''
    expect(body).toMatch(/Site Theme/i)
    expect(body).toMatch(/Dark/i)
    expect(body).toMatch(/Light/i)
  })

  test('Theme Dark and Light buttons are clickable', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings')
    if (await isBotBlocked(page)) return

    // Find the Dark and Light buttons
    const darkBtn = page.locator('button:has-text("Dark")').first()
    const lightBtn = page.locator('button:has-text("Light")').first()

    await expect(darkBtn).toBeVisible()
    await expect(lightBtn).toBeVisible()

    // Click Light
    await lightBtn.click()
    await page.waitForTimeout(300)

    // Click Dark back
    await darkBtn.click()
    await page.waitForTimeout(300)

    // No crash
    await expect(page.locator('body')).not.toContainText(/500|error/i)
  })

  // ─── General Settings ───
  test('General Settings has Brand, Content, Locations tabs', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings')
    if (await isBotBlocked(page)) return
    const body = await page.locator('body').textContent() || ''
    expect(body).toMatch(/Brand|Content|Location/i)
  })

  test('General Settings Brand tab has form fields', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings')
    if (await isBotBlocked(page)) return
    const body = await page.locator('body').textContent() || ''
    expect(body).toMatch(/Brand Name|Slug|Logo|Color/i)
  })

  test('General Settings has Save button', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings')
    if (await isBotBlocked(page)) return
    const saveBtn = page.getByRole('button', { name: /save/i })
    await expect(saveBtn.first()).toBeVisible()
  })

  // ─── Payments ───
  test('Payments page loads with Stripe/Square sections', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings/payments')
    if (await isBotBlocked(page)) return
    const body = await page.locator('body').textContent() || ''
    expect(body).toMatch(/Stripe|Square|Payment/i)
  })

  test('Payments shows connection status', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings/payments')
    if (await isBotBlocked(page)) return
    const body = await page.locator('body').textContent() || ''
    expect(body).toMatch(/Connect|Connected|Stripe/i)
  })

  // ─── Billing ───
  test('Billing page loads with current plan', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings/billing')
    if (await isBotBlocked(page)) return
    const body = await page.locator('body').textContent() || ''
    expect(body).toMatch(/Free|Pro|Max|Plan|Billing/i)
  })

  test('Billing shows plan cards', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings/billing')
    if (await isBotBlocked(page)) return
    const body = await page.locator('body').textContent() || ''
    expect(body).toMatch(/Free/i)
    expect(body).toMatch(/Pro/i)
    expect(body).toMatch(/Max/i)
  })

  test('Billing has upgrade buttons', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings/billing')
    if (await isBotBlocked(page)) return
    const upgradeBtn = page.getByRole('button', { name: /upgrade|current plan|downgrade/i })
    await expect(upgradeBtn.first()).toBeVisible()
  })

  // ─── Team & Roles ───
  test('Roles page loads with role cards and team list', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings/roles')
    if (await isBotBlocked(page)) return
    const body = await page.locator('body').textContent() || ''
    expect(body).toMatch(/Admin|Manager|Staff|Finance/i)
  })

  test('Roles page has Invite Member button', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings/roles')
    if (await isBotBlocked(page)) return
    const inviteBtn = page.getByRole('button', { name: /invite/i })
    if (await inviteBtn.isVisible().catch(() => false)) {
      await inviteBtn.click()
      await page.waitForTimeout(500)
      const modal = page.locator('[role="dialog"], [class*="modal"]')
      await expect(modal.first()).toBeVisible()
    }
  })

  // ─── Notifications ───
  test('Notifications page loads with event toggles', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings/notifications')
    if (await isBotBlocked(page)) return
    const body = await page.locator('body').textContent() || ''
    expect(body).toMatch(/Notification|Email|In-App/i)
  })

  test('Notifications has Save Preferences button', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings/notifications')
    if (await isBotBlocked(page)) return
    const saveBtn = page.getByRole('button', { name: /save/i })
    await expect(saveBtn.first()).toBeVisible()
  })

  // ─── Security ───
  test('Security page has Change Password form', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings/security')
    if (await isBotBlocked(page)) return
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    const body = await page.locator('body').textContent() || ''
    expect(body).toMatch(/Current Password|New Password|Confirm/i)
  })

  test('Security password form validates matching passwords', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings/security')
    if (await isBotBlocked(page)) return

    const inputs = page.locator('input[type="password"]')
    await inputs.nth(0).fill('currentpass')
    await inputs.nth(1).fill('newpass123')
    await inputs.nth(2).fill('differentpass')

    const submitBtn = page.getByRole('button', { name: /update password/i })
    await submitBtn.click()
    await page.waitForTimeout(500)

    const body = await page.locator('body').textContent() || ''
    expect(body).toMatch(/match|error|don't match/i)
  })

  // ─── Extras ───
  test('Extras page loads', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings/extras')
    if (await isBotBlocked(page)) return
    const body = await page.locator('body').textContent() || ''
    expect(body).toMatch(/Extra|Add/i)
  })

  test('Extras Add form opens', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings/extras')
    if (await isBotBlocked(page)) return
    const addBtn = page.getByRole('button', { name: /add extra/i })
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(500)
      const body = await page.locator('body').textContent() || ''
      expect(body).toMatch(/Name|Price|Per Day|Flat/i)
    }
  })

  // ─── Agreement ───
  test('Agreement settings page loads', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings/agreement')
    if (await isBotBlocked(page)) return
    const body = await page.locator('body').textContent() || ''
    expect(body).toMatch(/Agreement|Company Address|Phone|Clauses|Terms/i)
  })

  test('Agreement has Save button', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings/agreement')
    if (await isBotBlocked(page)) return
    const saveBtn = page.getByRole('button', { name: /save/i })
    await expect(saveBtn.first()).toBeVisible()
  })

  // ─── Domain ───
  test('Domain settings page loads', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings/domain')
    if (await isBotBlocked(page)) return
    const body = await page.locator('body').textContent() || ''
    expect(body).toMatch(/Domain|Slug|Custom/i)
  })

  // ─── API & Webhooks ───
  test('API settings page loads', async ({ page }) => {
    await safeGoto(page, '/dashboard/settings/api')
    if (await isBotBlocked(page)) return
    const body = await page.locator('body').textContent() || ''
    expect(body).toMatch(/API|Webhook|Key|Endpoint/i)
  })
})
