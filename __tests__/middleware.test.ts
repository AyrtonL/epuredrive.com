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
    const req = makeRequest('myfleet.epuredrive.com', '/fleet')
    const res = await middleware(req)
    expect(res.headers.get('x-middleware-rewrite')).toContain('/sites/myfleet/fleet')
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

describe('middleware — tenant hosts', () => {
  it('does not rewrite robots.txt or sitemap.xml on a tenant subdomain', async () => {
    for (const path of ['/robots.txt', '/sitemap.xml', '/manifest.webmanifest']) {
      const res = await middleware(makeRequest('myfleet.epuredrive.com', path))
      expect(res.headers.get('x-middleware-rewrite')).toBeNull()
    }
  })

  it('marks rewritten tenant requests with x-tenant-host', async () => {
    const res = await middleware(makeRequest('myfleet.epuredrive.com', '/fleet'))
    expect(res.headers.get('x-middleware-rewrite')).toContain('/sites/myfleet/fleet')
    expect(res.headers.get('x-middleware-request-x-tenant-host')).toBe('1')
  })

  it('strips a client-supplied x-tenant-host on the main domain', async () => {
    const req = new NextRequest('http://epuredrive.com/sites/myfleet', {
      headers: { host: 'epuredrive.com', 'x-tenant-host': '1' },
    })
    const res = await middleware(req)
    expect(res.headers.get('x-middleware-request-x-tenant-host')).toBeNull()
  })
})

describe('middleware — unknown tenant paths', () => {
  function carLookup(found: boolean) {
    const maybeSingle = jest.fn().mockResolvedValue({ data: found ? { id: 12 } : null, error: null })
    const eq2 = jest.fn().mockReturnValue({ maybeSingle })
    const eq1 = jest.fn().mockReturnValue({ eq: eq2 })
    return { from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ eq: eq1 }) }) }
  }

  it('rewrites a non-numeric unknown path to the 404 page', async () => {
    const res = await middleware(makeRequest('myfleet.epuredrive.com', '/zzz-not-real'))
    expect(res.headers.get('x-middleware-rewrite')).toContain('/__not-found')
  })

  it('keeps an existing car page', async () => {
    ;(createEdgeClient as jest.Mock).mockReturnValue(carLookup(true))
    const res = await middleware(makeRequest('myfleet.epuredrive.com', '/12'))
    expect(res.headers.get('x-middleware-rewrite')).toContain('/sites/myfleet/12')
  })

  it('404s a car id that does not belong to the tenant', async () => {
    ;(createEdgeClient as jest.Mock).mockReturnValue(carLookup(false))
    const res = await middleware(makeRequest('myfleet.epuredrive.com', '/999999'))
    expect(res.headers.get('x-middleware-rewrite')).toContain('/__not-found')
  })

  it('applies the same check to direct /sites/[slug]/... paths', async () => {
    const res = await middleware(makeRequest('epuredrive.com', '/sites/myfleet/zzz'))
    expect(res.headers.get('x-middleware-rewrite')).toContain('/__not-found')
  })
})

describe('middleware — CDN caching of the landing page', () => {
  it('lets the CDN cache the English landing page', async () => {
    const res = await middleware(makeRequest('epuredrive.com', '/'))
    expect(res.headers.get('netlify-cdn-cache-control')).toContain('s-maxage')
  })

  it('never lets the CDN cache the Spanish redirect', async () => {
    const req = new NextRequest('http://epuredrive.com/', {
      headers: { host: 'epuredrive.com', 'accept-language': 'es-US,es;q=0.9' },
    })
    const res = await middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('netlify-cdn-cache-control')).toBe('no-store')
  })
})
