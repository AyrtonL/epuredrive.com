/**
 * @jest-environment node
 */

jest.mock('../../lib/rate-limit', () => ({ rateLimit: jest.fn(() => null) }))

interface FakeReservation {
  id: string
  tenant_id: string
  car_id: number | null
  review_token: string
}

const RESERVATION: FakeReservation = {
  id: 'res-1',
  tenant_id: 'tenant-1',
  car_id: 42,
  review_token: 'tok-abc',
}

const inserted: Array<Record<string, unknown>> = []
let existingReview: { id: string } | null = null
let insertShouldConflict = false

jest.mock('../../lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'reservations') {
        return {
          select: () => ({
            eq: (_col: string, value: string) => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: value === RESERVATION.review_token ? RESERVATION : null,
                  error: null,
                }),
            }),
          }),
        }
      }
      if (table === 'reservation_reviews') {
        return {
          insert: (row: Record<string, unknown>) => {
            if (insertShouldConflict) {
              return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } })
            }
            inserted.push(row)
            return Promise.resolve({ error: null })
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }),
}))

import { POST } from '@/app/api/reviews/submit/route'
import { NextRequest } from 'next/server'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('https://epuredrive.com/api/reviews/submit', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/reviews/submit', () => {
  beforeEach(() => {
    inserted.length = 0
    existingReview = null
    insertShouldConflict = false
  })

  test('invalid token returns 404', async () => {
    const res = await POST(makeRequest({ token: 'nope', rating: 5, comment: '' }))
    expect(res.status).toBe(404)
  })

  test('invalid rating returns 400 without inserting', async () => {
    const res = await POST(makeRequest({ token: 'tok-abc', rating: 9, comment: '' }))
    expect(res.status).toBe(400)
    expect(inserted).toHaveLength(0)
  })

  test('valid submission inserts scoped to the token-resolved reservation', async () => {
    const res = await POST(makeRequest({ token: 'tok-abc', rating: 5, comment: 'Great car!' }))
    expect(res.status).toBe(200)
    expect(inserted).toEqual([
      {
        reservation_id: 'res-1',
        tenant_id: 'tenant-1',
        car_id: 42,
        rating: 5,
        comment: 'Great car!',
      },
    ])
  })

  test('duplicate submission (unique violation) returns 409', async () => {
    insertShouldConflict = true
    const res = await POST(makeRequest({ token: 'tok-abc', rating: 4, comment: '' }))
    expect(res.status).toBe(409)
  })
})
