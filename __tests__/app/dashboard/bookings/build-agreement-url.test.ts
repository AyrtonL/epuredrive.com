/**
 * @jest-environment node
 */

import { buildAgreementUrl } from '@/app/(dashboard)/dashboard/bookings/actions'

describe('buildAgreementUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = originalEnv
  })

  it('uses NEXT_PUBLIC_APP_URL when set', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.epuredrive.com'
    const url = await buildAgreementUrl('acme', 'tok-123')
    expect(url).toBe('https://app.epuredrive.com/sites/acme/agreement/tok-123')
  })

  it('falls back to the tenant subdomain when NEXT_PUBLIC_APP_URL is not set', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    const url = await buildAgreementUrl('acme', 'tok-123')
    expect(url).toBe('https://acme.epuredrive.com/sites/acme/agreement/tok-123')
  })
})
