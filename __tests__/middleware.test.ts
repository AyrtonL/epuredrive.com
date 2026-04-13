/**
 * @jest-environment node
 */
import { middleware } from '@/middleware'
import { NextRequest } from 'next/server'

jest.mock('../lib/supabase/edge', () => ({
  createEdgeClient: jest.fn(),
}))
import { createEdgeClient } from '../lib/supabase/edge'

function makeRequest(host: string, path = '/') {
  return new NextRequest(`http://${host}${path}`, {
    headers: { host },
  })
}

describe('middleware', () => {
  beforeEach(() => jest.clearAllMocks())

  it('rewrites *.epuredrive.com subdomains without DB call', async () => {
    const req = makeRequest('myfleet.epuredrive.com', '/cars')
    const res = await middleware(req)
    expect(res.headers.get('x-middleware-rewrite')).toContain('/sites/myfleet/cars')
    expect(createEdgeClient).not.toHaveBeenCalled()
  })

  it('looks up custom domain in DB and rewrites if found', async () => {
    const mockClient = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { slug: 'acme-rentals' }, error: null,
            }),
          }),
        }),
      }),
    }
    ;(createEdgeClient as jest.Mock).mockReturnValue(mockClient)

    const req = makeRequest('fleet.acme.com', '/')
    const res = await middleware(req)
    expect(res.headers.get('x-middleware-rewrite')).toContain('/sites/acme-rentals')
  })

  it('returns 404 for unknown custom domains', async () => {
    const mockClient = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    }
    ;(createEdgeClient as jest.Mock).mockReturnValue(mockClient)

    const req = makeRequest('unknown.example.com', '/')
    const res = await middleware(req)
    expect(res.status).toBe(404)
  })
})
