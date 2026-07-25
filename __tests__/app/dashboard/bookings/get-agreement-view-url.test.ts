/**
 * @jest-environment node
 */

jest.mock('../../../../lib/supabase/server', () => ({
  createClient: jest.fn(),
}))
jest.mock('../../../../lib/supabase/dashboard-auth', () => ({
  requireTenantId: jest.fn().mockResolvedValue({ tenantId: 'tenant-123', supabase: null }),
}))

import { getAgreementViewUrl } from '@/app/(dashboard)/dashboard/bookings/actions'
import { createClient } from '@/lib/supabase/server'

function mockSupabase(responses: { reservation?: any; tenant?: any }) {
  return {
    from: jest.fn((table: string) => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: table === 'reservations' ? responses.reservation ?? null : null,
            }),
          }),
          single: jest.fn().mockResolvedValue({
            data: table === 'tenants' ? responses.tenant ?? null : null,
          }),
        }),
      }),
    })),
  }
}

describe('getAgreementViewUrl', () => {
  it('returns an error when the reservation has no agreement_token', async () => {
    ;(createClient as jest.Mock).mockReturnValue(
      mockSupabase({ reservation: { agreement_token: null } })
    )

    const result = await getAgreementViewUrl(42)

    expect(result.url).toBeNull()
    expect(result.error).toMatch(/no agreement/i)
  })

  it('returns an error when the reservation is not found for this tenant', async () => {
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase({ reservation: null }))

    const result = await getAgreementViewUrl(42)

    expect(result.url).toBeNull()
    expect(result.error).toBeTruthy()
  })

  it('returns the built URL when a token and tenant slug exist', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.epuredrive.com'
    ;(createClient as jest.Mock).mockReturnValue(
      mockSupabase({
        reservation: { agreement_token: 'tok-123' },
        tenant: { slug: 'acme' },
      })
    )

    const result = await getAgreementViewUrl(42)

    expect(result.error).toBeNull()
    expect(result.url).toBe('https://app.epuredrive.com/sites/acme/agreement/tok-123')
  })
})
