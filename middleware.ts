// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getTenantSlug } from '@/lib/utils/routing'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const slug = getTenantSlug(host)

  if (slug) {
    const url = request.nextUrl.clone()
    // Rewrite /{anything} on subdomain → /_sites/{slug}/{anything}
    url.pathname = `/_sites/${slug}${url.pathname === '/' ? '' : url.pathname}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and API routes
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
