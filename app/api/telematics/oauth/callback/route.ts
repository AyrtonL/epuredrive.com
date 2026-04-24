// app/api/telematics/oauth/callback/route.ts
// GET /api/telematics/oauth/callback?code=&state=
// Completes the Bouncie OAuth authorization_code flow.
//
// Security (spec §5.2, §13.2 and audit findings #3, #5, #7):
//   - The `bouncie_oauth_state` cookie is deleted UNCONDITIONALLY at the top
//     of the handler so the nonce is single-use regardless of outcome.
//   - All failure modes (unauth, flag off, bad state, token exchange error)
//     redirect to the same generic error URL — we never expose specific
//     error codes to the client (prevents CSRF-probe fingerprinting).
//   - Token endpoint response bodies are never logged; `safeErrorMessage`
//     strips stack/URL data from caught errors before they reach the log.
//   - Feature flag is re-checked here (defense in depth vs Task 15).

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'
import { bouncieConfig } from '@/lib/telematics/config'
import { getProvider } from '@/lib/telematics/registry'
import { safeErrorMessage } from '@/lib/telematics/alerts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATE_COOKIE = 'bouncie_oauth_state'
const GENERIC_ERROR_PATH = '/dashboard/integrations/bouncie?error=auth_failed'

export async function GET(request: Request) {
  const siteUrl = getSiteUrl(request)
  const genericError = new URL(GENERIC_ERROR_PATH, siteUrl)

  // Audit finding #5: always clear the state cookie at the very top so the
  // nonce is single-use, independent of whether the rest of the flow
  // succeeds.
  const storedState = cookies().get(STATE_COOKIE)?.value ?? null
  cookies().delete(STATE_COOKIE)

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  // Auth check
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', siteUrl))
  }

  // Resolve tenant (mirrors Task 15 / requireTenantId).
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const tenantId = (profile as { tenant_id?: unknown } | null)?.tenant_id
  if (typeof tenantId !== 'string') {
    return NextResponse.redirect(genericError)
  }

  // Feature-flag gate (defense in depth) — spec §13.2.
  const enabled = await isFeatureEnabled(tenantId, 'bouncie_telematics')
  if (!enabled) {
    return NextResponse.redirect(genericError)
  }

  // State + code validation. Any mismatch → generic error.
  if (!code || !state || !storedState || state !== storedState) {
    console.warn('[bouncie oauth] state/code validation failed', {
      tenantId,
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasCookie: Boolean(storedState),
      stateMatches: state === storedState,
    })
    return NextResponse.redirect(genericError)
  }

  // Token exchange. Never log raw response bodies or error objects — they
  // contain bearer tokens (audit #7). safeErrorMessage strips everything
  // except the message.
  let tokens
  try {
    tokens = await getProvider('bouncie').exchangeCodeForToken(
      code,
      bouncieConfig.redirectUri,
    )
  } catch (err: unknown) {
    console.warn('[bouncie oauth] token exchange failed', {
      tenantId,
      msg: safeErrorMessage(err),
    })
    return NextResponse.redirect(genericError)
  }

  // Persist the connection + seed devices using the service-role client.
  // Dashboard-auth RLS would need a user-session → service role is explicit
  // here and matches the pattern used by app/api/stripe/webhook/route.ts.
  const admin = createAdminClient()

  const { data: connRow, error: connErr } = await admin
    .from('telematics_connections')
    .upsert(
      {
        tenant_id: tenantId,
        provider: 'bouncie',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokens.expires_at,
        scope: tokens.scope,
        account_email: tokens.account_email,
        status: 'active',
        last_sync_at: new Date().toISOString(),
        error_message: null,
      },
      { onConflict: 'tenant_id,provider' },
    )
    .select('id')
    .single()

  if (connErr || !connRow) {
    console.warn('[bouncie oauth] connection upsert failed', {
      tenantId,
      msg: safeErrorMessage(connErr),
    })
    return NextResponse.redirect(genericError)
  }

  const connectionId = (connRow as { id?: unknown }).id
  if (typeof connectionId !== 'string') {
    return NextResponse.redirect(genericError)
  }

  // Seed devices — failures here are logged but not fatal: the tenant is
  // connected, and the /dashboard/telematics/devices page will let them
  // re-sync.
  try {
    const vehicles = await getProvider('bouncie').listVehicles(tokens.access_token)
    for (const v of vehicles) {
      const { error: devErr } = await admin
        .from('telematics_devices')
        .upsert(
          {
            tenant_id: tenantId,
            connection_id: connectionId,
            imei: v.imei,
            vin: v.vin,
            nickname: v.nickname,
            last_seen_at: v.last_seen_at,
            battery_voltage: v.battery_voltage,
            online: v.online,
          },
          { onConflict: 'tenant_id,imei' },
        )
      if (devErr) {
        console.warn('[bouncie oauth] device upsert failed', {
          tenantId,
          imei: v.imei,
          msg: safeErrorMessage(devErr),
        })
      }
    }
  } catch (err: unknown) {
    console.warn('[bouncie oauth] listVehicles failed', {
      tenantId,
      msg: safeErrorMessage(err),
    })
    // Fall through — the connection is saved; seeding can be retried from UI.
  }

  return NextResponse.redirect(new URL('/dashboard/telematics/devices', siteUrl))
}

function getSiteUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
}
