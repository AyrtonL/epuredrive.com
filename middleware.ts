// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getTenantSlug } from '@/lib/utils/routing'
import { createEdgeClient } from '@/lib/supabase/edge'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''

  // Path 1: epuredrive.com subdomain → slug-based rewrite (no DB call)
  const slug = getTenantSlug(host)
  if (slug) {
    // Don't rewrite API routes — they live at the app root
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.next()
    }
    const url = request.nextUrl.clone()
    url.pathname = `/sites/${slug}${url.pathname === '/' ? '' : url.pathname}`
    return NextResponse.rewrite(url)
  }

  const hostname = host.split(':')[0]
  const isEpureDomain =
    hostname === 'epuredrive.com' ||
    hostname === 'www.epuredrive.com' ||
    hostname.endsWith('.epuredrive.com') ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1'

  // Path 2: marketing domain — auto-redirect Spanish browsers from `/` to `/es`.
  // Only fires on the exact root path so shared links to other pages
  // (e.g. /features, /sign-up) are never language-redirected.
  if (isEpureDomain && request.nextUrl.pathname === '/') {
    const acceptLang = request.headers.get('accept-language') ?? ''
    const primary = (acceptLang.split(',')[0] ?? '').trim().toLowerCase()
    if (primary.startsWith('es')) {
      const url = request.nextUrl.clone()
      url.pathname = '/es'
      const res = NextResponse.redirect(url, 307)
      // Make CDNs cache per-language to avoid serving the wrong redirect
      res.headers.set('Vary', 'Accept-Language')
      return res
    }
    const res = NextResponse.next()
    res.headers.set('Vary', 'Accept-Language')
    return res
  }

  // Path 3: custom domain → look up tenant by custom_domain column
  if (!isEpureDomain) {
    // Don't rewrite API routes — they live at the app root
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.next()
    }

    const supabase = createEdgeClient()
    const { data } = await supabase
      .from('tenants')
      .select('slug')
      .eq('custom_domain', hostname)
      .maybeSingle()

    if (!data?.slug) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const url = request.nextUrl.clone()
    url.pathname = `/sites/${data.slug}${url.pathname === '/' ? '' : url.pathname}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
