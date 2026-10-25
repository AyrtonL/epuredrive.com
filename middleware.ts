// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getTenantSlug } from '@/lib/utils/routing'
import { createEdgeClient } from '@/lib/supabase/edge'
import { refreshSession } from '@/lib/supabase/middleware'
import { TENANT_HOST_HEADER } from '@/lib/utils/site-base-header'

/**
 * Root-level files that must not be rewritten into a tenant site: the
 * host-aware robots.txt / sitemap.xml routes and anything in /public
 * (manifest, service worker, icons). Without this, the [carId] route
 * caught them and answered 200 with an HTML "Vehicle" page.
 */
function isRootLevelFile(pathname: string): boolean {
  return /^\/[^/]+\.[a-z0-9]+$/i.test(pathname)
}

/** Single-segment tenant routes besides car IDs (/[carId]). */
const TENANT_PAGES = new Set(['fleet', 'my-booking', 'booking-confirmation'])

/**
 * Decides whether a tenant-site path exists, so unknown URLs answer a real 404.
 * The [carId] route sits under loading.tsx, which streams a 200 before the page
 * can call notFound(); checking here is the only way to send the right status.
 */
async function tenantPathExists(slug: string, rest: string): Promise<boolean> {
  const segments = rest.split('/').filter(Boolean)
  if (segments.length !== 1) return true // '/', or nested routes Next resolves itself
  const [segment] = segments
  if (TENANT_PAGES.has(segment) || segment.startsWith('opengraph-image')) return true
  if (!/^\d+$/.test(segment)) return false

  try {
    const { data, error } = await createEdgeClient()
      .from('cars')
      .select('id, tenants!inner(slug)')
      .eq('id', Number(segment))
      .eq('tenants.slug', slug)
      .maybeSingle()
    if (error) return true // never 404 a page because of a lookup failure
    return !!data
  } catch {
    return true
  }
}

/** Rewrite target for paths that don't exist: Next serves app/not-found.tsx with a 404. */
const NOT_FOUND_PATH = '/__not-found'

/** Keep in sync with next.config.mjs. Netlify purges its CDN cache on every deploy. */
const MARKETING_CDN_CACHE = 'public, s-maxage=3600, stale-while-revalidate=86400, durable'

// Crawlers we never want to auto-redirect on `/` so they always see the
// canonical English landing page and correctly index /es via hreflang.
const BOT_UA_REGEX =
  /googlebot|bingbot|yandex(bot)?|duckduckbot|baiduspider|applebot|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|redditbot|ia_archiver|ahrefsbot|semrushbot|petalbot|msnbot/i

// On a tenant host (subdomain or custom domain), a path may already carry the
// /sites/{slug} prefix (older links, shared URLs). Strip it so it isn't
// prefixed a second time (/sites/x/sites/x/... → 404).
function stripTenantBase(slug: string, pathname: string): string {
  const base = `/sites/${slug}`
  if (pathname === base) return '/'
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length)
  return pathname
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const pathname = request.nextUrl.pathname

  // Forward the request path to Server Components so the root layout can
  // set <html lang> correctly (needed for /es to be identified as Spanish).
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  // Only middleware may mark a request as coming from a tenant host.
  requestHeaders.delete(TENANT_HOST_HEADER)

  // Path 1: epuredrive.com subdomain → slug-based rewrite (no DB call)
  const slug = getTenantSlug(host)
  if (slug) {
    requestHeaders.set(TENANT_HOST_HEADER, '1')
    // Don't rewrite API routes, robots.txt / sitemap.xml (host-aware app
    // routes) or static files — they live at the app root.
    if (pathname.startsWith('/api/') || isRootLevelFile(pathname)) {
      return NextResponse.next({ request: { headers: requestHeaders } })
    }
    const url = request.nextUrl.clone()
    const rest = stripTenantBase(slug, pathname)
    url.pathname = (await tenantPathExists(slug, rest))
      ? `/sites/${slug}${rest === '/' ? '' : rest}`
      : NOT_FOUND_PATH
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  }

  // Direct /sites/[slug]/[segment] paths on the main domain get the same check.
  const directMatch = pathname.match(/^\/sites\/([^/]+)(\/[^/]+)$/)
  if (directMatch && !(await tenantPathExists(directMatch[1], directMatch[2]))) {
    const url = request.nextUrl.clone()
    url.pathname = NOT_FOUND_PATH
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

    // ?lang=en comes from the "English" switch on the Spanish site: honor it
    // instead of bouncing a Spanish-language browser straight back to /es.
    const explicitEnglish = request.nextUrl.searchParams.get('lang') === 'en'
    if (!isBot && !explicitEnglish) {
      const acceptLang = request.headers.get('accept-language') ?? ''
      const primary = (acceptLang.split(',')[0] ?? '').trim().toLowerCase()
      if (primary.startsWith('es')) {
        const url = request.nextUrl.clone()
        url.pathname = '/es'
        const res = NextResponse.redirect(url, 307)
        // Make CDNs cache per-language to avoid serving the wrong redirect
        res.headers.set('Vary', 'Accept-Language')
        // The redirect depends on the visitor's language: never let a CDN keep it.
        res.headers.set('Netlify-CDN-Cache-Control', 'no-store')
        res.headers.set('Cache-Control', 'private, no-store')
        return res
      }
    }
    const res = NextResponse.next({ request: { headers: requestHeaders } })
    res.headers.set('Vary', 'Accept-Language')
    // The English landing page is the same for everyone, so the CDN may cache
    // it (next.config.mjs sets the same header on the origin response, which is
    // what Netlify's durable cache reads). Middleware runs before that cache, so
    // Spanish visitors are still redirected above.
    res.headers.set('Netlify-CDN-Cache-Control', MARKETING_CDN_CACHE)
    return res
  }

  // Path 3: custom domain → look up tenant by custom_domain column
  if (!isEpureDomain) {
    requestHeaders.set(TENANT_HOST_HEADER, '1')
    // Don't rewrite API routes, robots.txt / sitemap.xml or static files
    if (pathname.startsWith('/api/') || isRootLevelFile(pathname)) {
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
    const rest = stripTenantBase(data.slug, pathname)
    url.pathname = (await tenantPathExists(data.slug, rest))
      ? `/sites/${data.slug}${rest === '/' ? '' : rest}`
      : NOT_FOUND_PATH
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  }

  // Dashboard: refresh the session once here, where cookies can be written.
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    return refreshSession(request, requestHeaders)
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
