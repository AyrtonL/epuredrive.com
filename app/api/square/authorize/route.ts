import { NextRequest, NextResponse } from 'next/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { getSquareAuthorizationUrl } from '@/lib/square/oauth'

export async function GET(request: NextRequest) {
  const { tenantId } = await requireTenantId()
  const url = getSquareAuthorizationUrl(tenantId)
  return NextResponse.json({ url })
}
