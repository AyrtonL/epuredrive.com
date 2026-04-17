import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createOAuthClient, verifyState } from '@/lib/quickbooks/oauth-client'
import { qboRequest } from '@/lib/quickbooks/api-client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const stateParam = searchParams.get('state')
  const oauthError = searchParams.get('error')

  const DASHBOARD_URL = '/dashboard/integrations/quickbooks?qb=connected'
  const ERROR_URL = '/dashboard/integrations/quickbooks?qb=error'

  // Verify HMAC-signed state to prevent OAuth callback forgery
  const tenantId = stateParam ? verifyState(stateParam) : null

  if (oauthError || !tenantId) {
    console.error('[qb-callback] OAuth error or invalid state:', { oauthError, stateParam })
    return NextResponse.redirect(new URL(ERROR_URL, request.url))
  }

  try {
    // 1. Exchange authorization code for tokens
    const oauthClient = createOAuthClient()
    const authResponse = await oauthClient.createToken(request.url)
    const tokens = authResponse.getJson()

    if (!tokens.access_token || !tokens.refresh_token) {
      console.error('[qb-callback] Token exchange returned incomplete tokens')
      return NextResponse.redirect(new URL(ERROR_URL, request.url))
    }

    const realmId = tokens.realmId || searchParams.get('realmId')
    if (!realmId) {
      console.error('[qb-callback] No realmId in token response')
      return NextResponse.redirect(new URL(ERROR_URL, request.url))
    }

    const now = new Date()
    const accessExpiresAt = new Date(now.getTime() + (tokens.expires_in || 3600) * 1000)
    const refreshExpiresAt = new Date(now.getTime() + (tokens.x_refresh_token_expires_in || 8726400) * 1000)

    // 2. Fetch company name from QBO
    let companyName = 'QuickBooks Company'
    try {
      const base = process.env.QB_ENVIRONMENT === 'production'
        ? 'https://quickbooks.api.intuit.com'
        : 'https://sandbox-quickbooks.api.intuit.com'
      const infoRes = await fetch(`${base}/v3/company/${realmId}/companyinfo/${realmId}`, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: 'application/json',
        },
      })
      if (infoRes.ok) {
        const info = await infoRes.json()
        companyName = info?.CompanyInfo?.CompanyName || companyName
      }
    } catch {
      // Non-critical — use default company name
    }

    // 3. Save connection to Supabase (admin client bypasses RLS)
    const supabase = createAdminClient()
    const { error: upsertError } = await supabase.from('qb_connections').upsert({
      tenant_id: tenantId,
      realm_id: realmId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      access_token_expires_at: accessExpiresAt.toISOString(),
      refresh_token_expires_at: refreshExpiresAt.toISOString(),
      company_name: companyName,
      connected_at: now.toISOString(),
      sync_enabled: true,
    }, { onConflict: 'tenant_id' })

    if (upsertError) {
      console.error('[qb-callback] Supabase upsert error:', upsertError)
      return NextResponse.redirect(new URL(ERROR_URL, request.url))
    }

    console.log(`[qb-callback] Connected QBO company "${companyName}" (realm ${realmId}) for tenant ${tenantId}`)
    return NextResponse.redirect(new URL(DASHBOARD_URL, request.url))
  } catch (err) {
    console.error('[qb-callback] Internal error:', err)
    return NextResponse.redirect(new URL(ERROR_URL, request.url))
  }
}
