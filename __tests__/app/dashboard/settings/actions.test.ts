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

import { saveCustomDomain } from '@/app/(dashboard)/dashboard/settings/actions'

describe('saveCustomDomain', () => {
  it('rejects epuredrive.com domain', async () => {
    const result = await saveCustomDomain({ domain: 'fleet.epuredrive.com' })
    expect(result.error).toMatch(/cannot use epuredrive\.com/i)
  })

  it('rejects plain string without dots', async () => {
    const result = await saveCustomDomain({ domain: 'yourdomain' })
    expect(result.error).toMatch(/invalid domain format/i)
  })

  it('accepts valid custom domain format', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }
    const { createClient } = require('../../../../lib/supabase/server')
    createClient.mockReturnValue(mockSupabase)
    // NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID are not set in test → Netlify call returns error
    // but validation passes, so the error is about Netlify, not format
    const result = await saveCustomDomain({ domain: 'fleet.acme.com' })
    expect(result.error).not.toMatch(/invalid domain format/i)
    expect(result.error).not.toMatch(/cannot use epuredrive\.com/i)
  })
})
