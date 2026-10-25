/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const getSession = jest.fn()
let rotate: ((cookies: { name: string; value: string; options?: object }[]) => void) | null = null

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn((_url: string, _key: string, opts: { cookies: { setAll: typeof rotate } }) => {
    rotate = opts.cookies.setAll
    return { auth: { getSession } }
  }),
}))
import { createServerClient } from '@supabase/ssr'
import { refreshSession } from '@/lib/supabase/middleware'

const AUTH_COOKIE = 'sb-brwzjwbpguiignrxvjdc-auth-token'

function makeRequest(cookie?: string) {
  const headers: Record<string, string> = { host: 'epuredrive.com' }
  if (cookie) headers.cookie = cookie
  return new NextRequest('http://epuredrive.com/dashboard/bookings', { headers })
}

describe('refreshSession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    rotate = null
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://brwzjwbpguiignrxvjdc.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
  })

  it('skips Auth entirely for visitors without a session cookie', async () => {
    const req = makeRequest('theme=dark')
    const res = await refreshSession(req, new Headers(req.headers))
    expect(createServerClient).not.toHaveBeenCalled()
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('passes through untouched when the token is still valid', async () => {
    getSession.mockResolvedValue({ data: { session: {} }, error: null })
    const req = makeRequest(`${AUTH_COOKIE}=old`)
    const res = await refreshSession(req, new Headers(req.headers))
    expect(getSession).toHaveBeenCalledTimes(1)
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('writes rotated tokens to the browser and to this request', async () => {
    getSession.mockImplementation(async () => {
      rotate!([{ name: AUTH_COOKIE, value: 'new', options: { path: '/' } }])
      return { data: { session: {} }, error: null }
    })
    const req = makeRequest(`${AUTH_COOKIE}=old; theme=dark`)
    const res = await refreshSession(req, new Headers(req.headers))

    expect(res.headers.get('set-cookie')).toContain(`${AUTH_COOKIE}=new`)
    // Server Components read the forwarded request cookie header.
    const forwarded = res.headers.get('x-middleware-request-cookie') ?? ''
    expect(forwarded).toContain(`${AUTH_COOKIE}=new`)
    expect(forwarded).toContain('theme=dark')
    expect(forwarded).not.toContain(`${AUTH_COOKIE}=old`)
  })

  it('never fails the page when Auth is down', async () => {
    getSession.mockRejectedValue(new Error('timeout'))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const req = makeRequest(`${AUTH_COOKIE}=old`)
    const res = await refreshSession(req, new Headers(req.headers))
    expect(res.status).toBe(200)
    expect(res.headers.get('x-middleware-next')).toBe('1')
    spy.mockRestore()
  })
})
