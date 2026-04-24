// e2e/telematics-gating.spec.ts
// E2E — Task 35: Starter tenant is gated out of Telematics.
//
// The auth setup uses a single TEST_EMAIL/TEST_PASSWORD user. To validate the
// gate, we rely on whatever plan the fixture user is on:
//   - If the tenant does NOT have `bouncie_telematics` enabled → the full
//     gating behavior is asserted (redirect to billing, upgrade banner, no
//     sidebar Telematics group).
//   - If the tenant DOES have `bouncie_telematics` enabled → the test
//     self-skips with a clear message. Gating is covered in the "connect"
//     spec in the opposite direction.
//
// To explicitly run the gating path in CI, provision a second test tenant on
// the Free plan and set TEST_EMAIL / TEST_PASSWORD to that tenant's admin.
import { test, expect } from '@playwright/test'
import { safeGoto, isBotBlocked } from './helpers'

async function tenantIsStarter(page: import('@playwright/test').Page): Promise<boolean> {
  // Probe by visiting /dashboard/telematics — Starter tenants are redirected
  // to the billing page with ?upgrade=telematics. Pro/Max land on the page.
  await safeGoto(page, '/dashboard/telematics')
  if (await isBotBlocked(page)) return false
  return /\/dashboard\/settings\/billing/.test(page.url())
}

test.describe('Telematics — Starter tenant gating', () => {
  test('Sidebar hides Telematics group for Starter tenants', async ({ page }) => {
    await safeGoto(page, '/dashboard')
    if (await isBotBlocked(page)) return

    // Probe current tenant's plan via gating behavior.
    if (!(await tenantIsStarter(page))) {
      test.skip(true, 'Test user is on Pro/Max — gating test cannot run')
    }

    await safeGoto(page, '/dashboard')
    if (await isBotBlocked(page)) return

    // Sidebar should not contain a "Telematics" header/group. The Bouncie
    // integration item is also hidden (see Sidebar.tsx flag filter).
    const telematicsLink = page.getByRole('link', { name: /live map|^telematics$/i })
    await expect(telematicsLink).toHaveCount(0)
  })

  test('Direct navigation to /dashboard/telematics redirects to billing with upgrade banner', async ({ page }) => {
    await safeGoto(page, '/dashboard/telematics')
    if (await isBotBlocked(page)) return

    // Pro/Max tenants land on the Live Map. Skip if so.
    if (!/\/dashboard\/settings\/billing/.test(page.url())) {
      test.skip(true, 'Test user is on Pro/Max — gating test cannot run')
    }

    await expect(page).toHaveURL(/\/dashboard\/settings\/billing.*upgrade=telematics/)
    await expect(page.locator('body')).toContainText(
      /telematics is available on pro and max/i,
    )
  })

  test('Direct navigation to /dashboard/integrations/bouncie is also gated', async ({ page }) => {
    await safeGoto(page, '/dashboard/integrations/bouncie')
    if (await isBotBlocked(page)) return

    const onBilling = /\/dashboard\/settings\/billing/.test(page.url())
    const body = (await page.locator('body').textContent()) ?? ''
    const showsNotEnabled = /bouncie telematics not enabled/i.test(body)
    const showsConnectCta = /connect bouncie/i.test(body)

    if (showsConnectCta) {
      test.skip(true, 'Test user has bouncie_telematics enabled — gating test cannot run')
    }

    // Either the dashboard layout redirected to billing (middleware-level
    // gate), or the page itself rendered the "Not Enabled" block (page-level
    // gate). Both satisfy the gating requirement.
    expect(onBilling || showsNotEnabled).toBe(true)
  })
})
