import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeSquareCode, verifyState } from '@/lib/square/oauth'
import { getSquareClient } from '@/lib/square/client'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard/settings/payments?error=missing_params', request.url))
  }

  const tenantId = verifyState(state)
  if (!tenantId) {
    return NextResponse.redirect(new URL('/dashboard/settings/payments?error=invalid_state', request.url))
  }

  try {
    const tokens = await exchangeSquareCode(code)

    // Fetch the primary location for this merchant
    const client = getSquareClient(tokens.access_token)
    const locationsResult = await client.locations.list()
    const primaryLocation = locationsResult.locations?.find(l => l.status === 'ACTIVE')

    const supabase = createAdminClient()
    await supabase.from('tenants').update({
      square_merchant_id: tokens.merchant_id,
      square_access_token: tokens.access_token,
      square_refresh_token: tokens.refresh_token,
      square_token_expires_at: tokens.expires_at,
      square_location_id: primaryLocation?.id || null,
    }).eq('id', tenantId)

    return NextResponse.redirect(
      new URL('/dashboard/settings/payments?square_connected=true', request.url)
    )
  } catch (err) {
    console.error('[square] OAuth callback error:', err)
    return NextResponse.redirect(
      new URL('/dashboard/settings/payments?error=square_oauth_failed', request.url)
    )
  }
}
