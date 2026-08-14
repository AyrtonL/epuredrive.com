/**
 * @jest-environment node
 */

const inserted: Array<Record<string, unknown>> = []

jest.mock('../../lib/supabase/dashboard-auth', () => ({
  requireTenantId: jest.fn(() =>
    Promise.resolve({ supabase: {}, tenantId: 'tenant-123' }),
  ),
}))

jest.mock('../../lib/supabase/server', () => ({
  createClient: () => ({
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        inserted.push({ table, ...row })
        return Promise.resolve({ error: null })
      },
    }),
  }),
}))

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { submitTenantFeedback } from '@/app/(dashboard)/dashboard/feedback/actions'

describe('submitTenantFeedback', () => {
  beforeEach(() => {
    inserted.length = 0
  })

  test('inserts a valid rating + comment scoped to the authenticated tenant', async () => {
    const result = await submitTenantFeedback({ rating: 4, comment: 'Pretty good so far' })
    expect(result.error).toBeNull()
    expect(inserted).toEqual([
      {
        table: 'tenant_feedback',
        tenant_id: 'tenant-123',
        rating: 4,
        comment: 'Pretty good so far',
      },
    ])
  })

  test('rejects an out-of-range rating without inserting', async () => {
    const result = await submitTenantFeedback({ rating: 7, comment: 'x' })
    expect(result.error).toBe('Invalid rating.')
    expect(inserted).toHaveLength(0)
  })

  test('stores null for an empty comment', async () => {
    await submitTenantFeedback({ rating: 5, comment: '   ' })
    expect(inserted[0].comment).toBeNull()
  })
})
