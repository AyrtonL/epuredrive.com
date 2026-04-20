import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeSquareCode, verifyState } from '@/lib/square/oauth'
import { getSquareClient } from '@/lib/square/client'
import { encryptSquareToken } from '@/lib/square/token-crypto'

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
    console.log('[square/callback] Exchanging code for tenant:', tenantId)
    const tokens = await exchangeSquareCode(code)
    console.log('[square/callback] Token exchange success, merchant:', tokens.merchant_id)

    // Fetch the primary location for this merchant
    const client = getSquareClient(tokens.access_token)
    const locationsResult = await client.locations.list()
    const primaryLocation = locationsResult.locations?.find(l => l.status === 'ACTIVE')
    console.log('[square/callback] Primary location:', primaryLocation?.id || 'none found')

    const supabase = createAdminClient()
    const { error: updateError } = await supabase.from('tenants').update({
      square_merchant_id: tokens.merchant_id,
      square_access_token: encryptSquareToken(tokens.access_token),
      square_refresh_token: encryptSquareToken(tokens.refresh_token),
      square_token_expires_at: tokens.expires_at,
      square_location_id: primaryLocation?.id || null,
    }).eq('id', tenantId)

    if (updateError) {
      console.error('[square/callback] DB update failed:', updateError)
      return NextResponse.redirect(
        new URL('/dashboard/settings/payments?error=db_update_failed', request.url)
      )
    }

    console.log('[square/callback] Tenant updated successfully')
    return NextResponse.redirect(
      new URL('/dashboard/settings/payments?square_connected=true', request.url)
    )
  } catch (err) {
    console.error('[square/callback] OAuth callback error:', err)
    const detail = err instanceof Error ? err.message : 'unknown'
    return NextResponse.redirect(
      new URL(`/dashboard/settings/payments?error=square_oauth_failed_${encodeURIComponent(detail)}`, request.url)
    )
  }
}
