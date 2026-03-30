// __tests__/routing.test.ts
import { getTenantSlug } from '../lib/utils/routing'

describe('getTenantSlug', () => {
  it('returns slug for valid subdomain', () => {
    expect(getTenantSlug('myfleet.epuredrive.com')).toBe('myfleet')
  })

  it('returns slug with hyphens', () => {
    expect(getTenantSlug('ayrtonn-lg-1774229361678.epuredrive.com')).toBe('ayrtonn-lg-1774229361678')
  })

  it('returns null for main domain', () => {
    expect(getTenantSlug('epuredrive.com')).toBeNull()
  })

  it('returns null for www', () => {
    expect(getTenantSlug('www.epuredrive.com')).toBeNull()
  })

  it('returns null for reserved subdomains', () => {
    expect(getTenantSlug('admin.epuredrive.com')).toBeNull()
    expect(getTenantSlug('app.epuredrive.com')).toBeNull()
    expect(getTenantSlug('api.epuredrive.com')).toBeNull()
  })

  it('returns null for localhost', () => {
    expect(getTenantSlug('localhost:3000')).toBeNull()
  })

  it('returns null for unrelated domain', () => {
    expect(getTenantSlug('example.com')).toBeNull()
  })
})
