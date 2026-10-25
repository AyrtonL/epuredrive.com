/**
 * @jest-environment node
 */
import { middleware } from '@/middleware'
import { NextRequest } from 'next/server'

jest.mock('../lib/supabase/edge', () => ({
  createEdgeClient: jest.fn(),
}))
import { createEdgeClient } from '../lib/supabase/edge'
jest.mock('../lib/supabase/middleware', () => {
  const { NextResponse } = jest.requireActual('next/server')
  return { refreshSession: jest.fn(() => NextResponse.next()) }
})
import { refreshSession } from '../lib/supabase/middleware'

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

  it('serves the tenant home at the subdomain root', async () => {
    const req = makeRequest('myfleet.epuredrive.com', '/')
    const res = await middleware(req)
    expect(new URL(res.headers.get('x-middleware-rewrite')!).pathname).toBe('/sites/myfleet')
  })

  // Site pages link to /sites/{slug}/... — on the tenant's own subdomain those
  // links must not be prefixed a second time (/sites/x/sites/x/... → 404).
  it('does not double-prefix /sites/{slug} links on the subdomain', async () => {
    for (const path of ['/sites/myfleet', '/sites/myfleet/42', '/sites/myfleet/my-booking']) {
      const res = await middleware(makeRequest('myfleet.epuredrive.com', path))
      const rewrite = res.headers.get('x-middleware-rewrite')
      const finalPath = rewrite ? new URL(rewrite).pathname : path
      expect(finalPath).toBe(path)
    }
  })

  it('still prefixes a path that only looks like another tenant', async () => {
    const res = await middleware(makeRequest('myfleet.epuredrive.com', '/sites/otherfleet/42'))
    expect(new URL(res.headers.get('x-middleware-rewrite')!).pathname).toBe('/sites/myfleet/sites/otherfleet/42')
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

  it('does not double-prefix /sites/{slug} links on a custom domain', async () => {
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

    const res = await middleware(makeRequest('fleet.acme.com', '/sites/acme-rentals/42'))
    const rewrite = res.headers.get('x-middleware-rewrite')
    expect(rewrite ? new URL(rewrite).pathname : '/sites/acme-rentals/42').toBe('/sites/acme-rentals/42')
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

describe('middleware — dashboard session refresh', () => {
  it('routes dashboard requests through the session refresh', async () => {
    jest.clearAllMocks()
    for (const path of ['/dashboard', '/dashboard/bookings']) {
      await middleware(makeRequest('epuredrive.com', path))
    }
    expect(refreshSession).toHaveBeenCalledTimes(2)
    await middleware(makeRequest('epuredrive.com', '/dashboards-are-cool'))
    await middleware(makeRequest('epuredrive.com', '/login'))
    await middleware(makeRequest('myfleet.epuredrive.com', '/dashboard'))
    expect(refreshSession).toHaveBeenCalledTimes(2)
  })
})

describe('middleware — language switch', () => {
  it('does not redirect a Spanish browser that chose English', async () => {
    const req = new NextRequest('http://epuredrive.com/?lang=en', {
      headers: { host: 'epuredrive.com', 'accept-language': 'es-US,es;q=0.9' },
    })
    const res = await middleware(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
  })
})
