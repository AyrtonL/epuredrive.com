import type { Tenant } from '../supabase/types'

describe('Tenant experience_pillars type', () => {
  it('accepts null', () => {
    const t = { experience_pillars: null } as Pick<Tenant, 'experience_pillars'>
    expect(t.experience_pillars).toBeNull()
  })

  it('accepts array of pillar objects', () => {
    const pillars: Tenant['experience_pillars'] = [
      { title: 'Fast Delivery', body: 'We come to you.' },
      { title: 'Any Occasion', body: 'Weddings, airports, events.' },
      { title: 'Fair Pricing', body: 'No hidden fees.' },
    ]
    expect(pillars).toHaveLength(3)
    expect(pillars![0].title).toBe('Fast Delivery')
  })
})
