import { NextResponse } from 'next/server'
import { getAuthorizationUrl } from '@/lib/quickbooks/oauth-client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenant_id')

  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 })
  }

  try {
    const authUrl = getAuthorizationUrl(tenantId)
    return NextResponse.redirect(authUrl)
  } catch (err) {
    console.error('[qb-auth] Failed to generate auth URL:', err)
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
}
