import { createEdgeClient } from '@/lib/supabase/edge'

describe('createEdgeClient', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key'
  })

  it('returns a supabase client with from() method', () => {
    const client = createEdgeClient()
    expect(typeof client.from).toBe('function')
  })

  it('throws if NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    const orig = process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    expect(() => createEdgeClient()).toThrow()
    process.env.NEXT_PUBLIC_SUPABASE_URL = orig
  })
})
