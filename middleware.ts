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
    const url = request.nextUrl.clone()
    url.pathname = `/sites/${slug}${url.pathname === '/' ? '' : url.pathname}`
    return NextResponse.rewrite(url)
  }

  // Path 2: custom domain → look up tenant by custom_domain column
  const hostname = host.split(':')[0]
  const isEpureDomain =
    hostname === 'epuredrive.com' ||
    hostname === 'www.epuredrive.com' ||
    hostname.endsWith('.epuredrive.com') ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1'

  if (!isEpureDomain) {
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
