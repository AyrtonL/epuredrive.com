import { NextRequest, NextResponse } from 'next/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { getSquareAuthorizationUrl } from '@/lib/square/oauth'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantId()
    const url = getSquareAuthorizationUrl(tenantId)
    return NextResponse.json({ url })
  } catch (err) {
    console.error('[square/authorize] Failed:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
