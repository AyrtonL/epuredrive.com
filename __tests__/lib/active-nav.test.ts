// __tests__/lib/active-nav.test.ts
import { activeHref } from '@/lib/navigation/active-nav'

const HREFS = ['/dashboard', '/dashboard/telematics', '/dashboard/telematics/devices', '/dashboard/settings', '/dashboard/settings/roles', '/dashboard/fleet']

describe('activeHref', () => {
  it('picks the most specific matching link', () => {
    expect(activeHref('/dashboard/telematics/devices', HREFS)).toBe('/dashboard/telematics/devices')
    expect(activeHref('/dashboard/settings/roles', HREFS)).toBe('/dashboard/settings/roles')
  })

  it('keeps the parent active on its own page and on unlisted children', () => {
    expect(activeHref('/dashboard/telematics', HREFS)).toBe('/dashboard/telematics')
    expect(activeHref('/dashboard/fleet/3', HREFS)).toBe('/dashboard/fleet')
  })

  it('only matches the overview exactly', () => {
    expect(activeHref('/dashboard', HREFS)).toBe('/dashboard')
    expect(activeHref('/dashboard/unknown', HREFS)).toBeNull()
  })

  it('does not treat a shared prefix as a match', () => {
    expect(activeHref('/dashboard/fleetwide', HREFS)).toBeNull()
  })
})
