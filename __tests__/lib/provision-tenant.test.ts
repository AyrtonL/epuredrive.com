// __tests__/lib/provision-tenant.test.ts
//
// Regression: on 2026-10-13 a transient profile read failure in the dashboard
// layout made the self-heal path create a brand-new empty tenant for an
// existing user and overwrite their profile (tenant + role). Provisioning must
// only ever fill a genuinely missing tenant, and must never clobber one.

import { provisionTenantForUser } from '@/lib/tenant/provision-tenant'

jest.mock('../../lib/email/resend', () => ({ sendEmail: jest.fn(async () => ({ error: null })) }))

type Profile = { id: string; tenant_id: string | null; role: string | null } | null

interface FakeState {
  profile: Profile
  profileReadError?: { message: string } | null
  tenantInserts: unknown[]
  profileWrites: Array<{ op: string; values: Record<string, unknown>; filters: Record<string, unknown> }>
}

function fakeAdmin(state: FakeState) {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {}
      let op = 'select'
      let values: Record<string, unknown> = {}
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: (col: string, v: unknown) => { filters[`eq:${col}`] = v; return chain },
        is: (col: string, v: unknown) => { filters[`is:${col}`] = v; return chain },
        insert: (v: Record<string, unknown>) => {
          op = 'insert'
          values = v
          if (table === 'tenants') state.tenantInserts.push(v)
          if (table === 'profiles') state.profileWrites.push({ op, values, filters })
          return chain
        },
        update: (v: Record<string, unknown>) => { op = 'update'; values = v; return chain },
        maybeSingle: async () => {
          if (table === 'profiles' && op === 'select') {
            return { data: state.profile, error: state.profileReadError ?? null }
          }
          if (table === 'profiles' && op === 'update') {
            state.profileWrites.push({ op, values, filters })
            const matches = state.profile && (filters['is:tenant_id'] !== null || state.profile.tenant_id === null)
            return { data: matches ? { id: state.profile!.id } : null, error: null }
          }
          return { data: null, error: null }
        },
        single: async () => {
          if (table === 'tenants') return { data: { id: 'new-tenant' }, error: null }
          return { data: null, error: null }
        },
        then: undefined,
      }
      // insert(...) on profiles is awaited directly
      ;(chain as { then?: unknown }).then = (resolve: (v: unknown) => void) => resolve({ error: null })
      return chain
    },
  }
}

const mockAdmin = jest.fn()
jest.mock('../../lib/supabase/admin', () => ({ createAdminClient: () => mockAdmin() }))

function setup(state: Partial<FakeState>): FakeState {
  const full: FakeState = { profile: null, tenantInserts: [], profileWrites: [], ...state }
  mockAdmin.mockReturnValue(fakeAdmin(full))
  return full
}

describe('provisionTenantForUser', () => {
  it('returns the existing tenant and creates nothing when the user already has one', async () => {
    const state = setup({ profile: { id: 'u1', tenant_id: 'epure', role: 'superuser' } })
    await expect(provisionTenantForUser('u1', 'a@b.com', {})).resolves.toBe('epure')
    expect(state.tenantInserts).toHaveLength(0)
    expect(state.profileWrites).toHaveLength(0)
  })

  it('does nothing when the profile cannot be read', async () => {
    const state = setup({ profileReadError: { message: 'network' } })
    await expect(provisionTenantForUser('u1', 'a@b.com', {})).resolves.toBeNull()
    expect(state.tenantInserts).toHaveLength(0)
    expect(state.profileWrites).toHaveLength(0)
  })

  it('creates a tenant and an admin profile for a user with no profile row', async () => {
    const state = setup({ profile: null })
    await expect(provisionTenantForUser('u1', 'a@b.com', { company: 'Acme' })).resolves.toBe('new-tenant')
    expect(state.tenantInserts).toHaveLength(1)
    expect(state.profileWrites[0]).toMatchObject({ op: 'insert', values: { id: 'u1', tenant_id: 'new-tenant', role: 'admin' } })
  })

  it('fills a missing tenant without overwriting the existing role', async () => {
    const state = setup({ profile: { id: 'u1', tenant_id: null, role: 'superuser' } })
    await expect(provisionTenantForUser('u1', 'a@b.com', {})).resolves.toBe('new-tenant')
    const write = state.profileWrites[0]
    expect(write.op).toBe('update')
    expect(write.values).toEqual({ tenant_id: 'new-tenant' })
    expect(write.filters).toMatchObject({ 'eq:id': 'u1', 'is:tenant_id': null })
  })
})
