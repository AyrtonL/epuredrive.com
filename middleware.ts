// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getTenantSlug } from '@/lib/utils/routing'
import { createEdgeClient } from '@/lib/supabase/edge'

// Crawlers we never want to auto-redirect on `/` so they always see the
// canonical English landing page and correctly index /es via hreflang.
const BOT_UA_REGEX =
  /googlebot|bingbot|yandex(bot)?|duckduckbot|baiduspider|applebot|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|redditbot|ia_archiver|ahrefsbot|semrushbot|petalbot|msnbot/i

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const pathname = request.nextUrl.pathname

  // Forward the request path to Server Components so the root layout can
  // set <html lang> correctly (needed for /es to be identified as Spanish).
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  // Path 1: epuredrive.com subdomain → slug-based rewrite (no DB call)
  const slug = getTenantSlug(host)
  if (slug) {
    // Don't rewrite API routes — they live at the app root
    if (pathname.startsWith('/api/')) {
      return NextResponse.next({ request: { headers: requestHeaders } })
    }
    const url = request.nextUrl.clone()
    url.pathname = `/sites/${slug}${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
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
  // Crawlers are exempt so they always index the canonical `/` page.
  if (isEpureDomain && pathname === '/') {
    const ua = request.headers.get('user-agent') ?? ''
    const isBot = BOT_UA_REGEX.test(ua)

    if (!isBot) {
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
    }
    const res = NextResponse.next({ request: { headers: requestHeaders } })
    res.headers.set('Vary', 'Accept-Language')
    return res
  }

  // Path 3: custom domain → look up tenant by custom_domain column
  if (!isEpureDomain) {
    // Don't rewrite API routes — they live at the app root
    if (pathname.startsWith('/api/')) {
      return NextResponse.next({ request: { headers: requestHeaders } })
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
    url.pathname = `/sites/${data.slug}${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
