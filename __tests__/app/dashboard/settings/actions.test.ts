/**
 * @jest-environment node
 */

jest.mock('../../../../lib/supabase/server', () => ({
  createClient: jest.fn(),
}))
jest.mock('../../../../lib/supabase/dashboard-auth', () => ({
  requireTenantId: jest.fn().mockResolvedValue({
    tenantId: 'tenant-123',
    supabase: null,
  }),
}))
jest.mock('../../../../lib/supabase/feature-flags', () => ({
  isFeatureEnabled: jest.fn().mockResolvedValue(true),
}))

import { saveCustomDomain } from '@/app/(dashboard)/dashboard/settings/actions'

/** Minimal chainable Supabase mock: `.from('tenants').select('plan').eq().single()`
 *  resolves with the given plan, `.from('tenants').update().eq()` resolves with no error. */
function mockSupabaseForPlan(plan: string) {
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { plan }, error: null }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
  }
}

describe('saveCustomDomain', () => {
  beforeEach(() => {
    const { createClient } = require('../../../../lib/supabase/server')
    createClient.mockReturnValue(mockSupabaseForPlan('pro'))
  })

  it('rejects epuredrive.com domain', async () => {
    const result = await saveCustomDomain({ domain: 'fleet.epuredrive.com' })
    expect(result.error).toMatch(/cannot use epuredrive\.com/i)
  })

  it('rejects plain string without dots', async () => {
    const result = await saveCustomDomain({ domain: 'yourdomain' })
    expect(result.error).toMatch(/invalid domain format/i)
  })

  it('accepts valid custom domain format on a Pro-plan tenant', async () => {
    // NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID are not set in test → Netlify call returns error
    // but validation passes, so the error is about Netlify, not format
    const result = await saveCustomDomain({ domain: 'fleet.acme.com' })
    expect(result.error).not.toMatch(/invalid domain format/i)
    expect(result.error).not.toMatch(/cannot use epuredrive\.com/i)
    expect(result.error).not.toMatch(/require a pro plan/i)
  })

  it('rejects a custom domain for a free-plan tenant even when the feature flag is on', async () => {
    const { createClient } = require('../../../../lib/supabase/server')
    createClient.mockReturnValue(mockSupabaseForPlan('free'))
    const result = await saveCustomDomain({ domain: 'fleet.acme.com' })
    expect(result.error).toMatch(/require a pro plan/i)
  })
})
