import { NextRequest, NextResponse } from 'next/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { tenantId } = await requireTenantId()

  await supabase.from('tenants').update({
    square_merchant_id: null,
    square_access_token: null,
    square_refresh_token: null,
    square_token_expires_at: null,
    square_location_id: null,
    payment_processor: 'stripe',
  }).eq('id', tenantId)

  return NextResponse.json({ success: true })
}
