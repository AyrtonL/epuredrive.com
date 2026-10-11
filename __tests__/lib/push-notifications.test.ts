/**
 * @jest-environment node
 */

jest.mock('../../lib/notifications/create', () => ({ createInAppNotification: jest.fn().mockResolvedValue(undefined) }))
jest.mock('web-push', () => ({ __esModule: true, default: { setVapidDetails: jest.fn(), sendNotification: jest.fn() } }))
jest.mock('../../lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))

import { createInAppNotification } from '../../lib/notifications/create'
import { notifyExpiringDocuments } from '../../lib/notifications/expiring-documents'

const TODAY = '2026-10-11'
const TOMORROW = '2026-10-12'

/** Minimal stand-in for the two reservation queries. */
function reservationsClient(startingTomorrow: object[], active: object[]) {
  const query = (rows: object[]) => {
    const q: Record<string, unknown> = {}
    for (const m of ['select', 'in', 'eq', 'or']) q[m] = () => q
    q.then = (resolve: (v: unknown) => void) => resolve({ data: rows, error: null })
    return q
  }
  let call = 0
  return { from: () => query(call++ === 0 ? startingTomorrow : active) } as never
}

const base = { tenant_id: 't1', customer_name: 'Ana', booking_code: 'E-AAA111', status: 'confirmed' }

describe('notifyExpiringDocuments', () => {
  beforeEach(() => jest.clearAllMocks())

  it('alerts when a rental starting tomorrow outlives the license', async () => {
    const sent = await notifyExpiringDocuments(reservationsClient([
      { ...base, id: 1, pickup_date: TOMORROW, return_date: '2026-10-20', license_expiration_date: '2026-10-15', insurance_expiration_date: null },
    ], []), TODAY, TOMORROW)
    expect(sent).toBe(1)
    const call = (createInAppNotification as jest.Mock).mock.calls[0][0]
    expect(call).toMatchObject({ tenantId: 't1', event: 'document_expiring' })
    expect(call.body).toContain('Ana (E-AAA111): license expires before return')
  })

  it('does not alert when documents outlast the rental (or the expiry is the return day)', async () => {
    const sent = await notifyExpiringDocuments(reservationsClient([
      { ...base, id: 2, pickup_date: TOMORROW, return_date: '2026-10-20', license_expiration_date: '2027-01-01', insurance_expiration_date: '2026-10-20' },
      { ...base, id: 3, pickup_date: TOMORROW, return_date: '2026-10-20', license_expiration_date: null, insurance_expiration_date: null },
    ], []), TODAY, TOMORROW)
    expect(sent).toBe(0)
    expect(createInAppNotification).not.toHaveBeenCalled()
  })

  it('alerts for an active rental whose insurance expires tomorrow, one message per tenant', async () => {
    const sent = await notifyExpiringDocuments(reservationsClient([
      { ...base, id: 4, pickup_date: TOMORROW, return_date: '2026-10-14', license_expiration_date: '2026-10-13', insurance_expiration_date: '2026-10-13' },
    ], [
      { ...base, id: 5, customer_name: 'Luis', booking_code: 'E-BBB222', status: 'active', pickup_date: '2026-10-05', return_date: '2026-10-18', license_expiration_date: null, insurance_expiration_date: TOMORROW },
      { ...base, id: 6, tenant_id: 't2', customer_name: 'Eva', booking_code: null, status: 'active', pickup_date: '2026-10-01', return_date: '2026-10-30', license_expiration_date: TOMORROW, insurance_expiration_date: null },
    ]), TODAY, TOMORROW)
    expect(sent).toBe(2)
    const byTenant = Object.fromEntries((createInAppNotification as jest.Mock).mock.calls.map(([c]) => [c.tenantId, c]))
    expect(byTenant.t1.body.split('\n')).toEqual([
      'Ana (E-AAA111): license & insurance expires before return',
      'Luis (E-BBB222): insurance expires tomorrow',
    ])
    expect(byTenant.t2.body).toBe('Eva: license expires tomorrow')
  })
})

describe('sendPushToTenant', () => {
  const OLD_ENV = process.env
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env = { ...OLD_ENV, NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' }
  })
  afterAll(() => { process.env = OLD_ENV })

  async function pushClient(subs: { id: number; endpoint: string; p256dh: string; auth: string }[]) {
    // resetModules() → take the fresh mock instances send.ts will import
    const admin = await import('../../lib/supabase/admin')
    const wp = (await import('web-push')).default
    const deleted: number[][] = []
    const chain = (result: unknown) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'not', 'update']) q[m] = () => q
      q.delete = () => ({ in: (_c: string, ids: number[]) => { deleted.push(ids); return Promise.resolve({}) } })
      q.then = (resolve: (v: unknown) => void) => resolve(result)
      return q
    }
    ;(admin.createAdminClient as jest.Mock).mockReturnValue({ from: () => chain({ data: subs, error: null }) })
    return { deleted, wp }
  }

  it('sends to each device and removes subscriptions the browser dropped (410)', async () => {
    const { deleted, wp } = await pushClient([
      { id: 1, endpoint: 'https://push.example/a', p256dh: 'k', auth: 'a' },
      { id: 2, endpoint: 'https://push.example/b', p256dh: 'k', auth: 'a' },
    ])
    ;(wp.sendNotification as jest.Mock)
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(Object.assign(new Error('gone'), { statusCode: 410 }))
    const { sendPushToTenant } = await import('../../lib/push/send')
    const sent = await sendPushToTenant('t1', { title: 'New Booking', url: '/dashboard/bookings' })
    expect(sent).toBe(1)
    expect(deleted).toEqual([[2]])
    const payload = JSON.parse((wp.sendNotification as jest.Mock).mock.calls[0][1])
    expect(payload).toMatchObject({ title: 'New Booking', url: '/dashboard/bookings' })
  })

  it('is a silent no-op when VAPID keys are missing', async () => {
    delete process.env.VAPID_PRIVATE_KEY
    const { wp } = await pushClient([{ id: 1, endpoint: 'https://push.example/a', p256dh: 'k', auth: 'a' }])
    const { sendPushToTenant } = await import('../../lib/push/send')
    expect(await sendPushToTenant('t1', { title: 'x' })).toBe(0)
    expect(wp.sendNotification).not.toHaveBeenCalled()
  })
})
