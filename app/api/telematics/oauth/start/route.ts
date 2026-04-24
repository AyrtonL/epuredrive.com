// app/api/telematics/oauth/start/route.ts
// GET /api/telematics/oauth/start
// Kicks off the Bouncie OAuth authorization_code flow.
//
// Security (spec §5.2, §13.2 and audit finding #3):
//   - Must check isFeatureEnabled at the API boundary — middleware gates
//     /dashboard/* but not /api/*, so a tenant without the bouncie_telematics
//     flag could otherwise start the flow directly.
//   - state nonce is 16 random bytes hex, stored in an httpOnly+secure cookie
//     with 600 s TTL; the callback compares and then deletes it.
//   - Never logs the token endpoint response body (no tokens handled here,
//     just the authorize URL).

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'
import { bouncieConfig } from '@/lib/telematics/config'
import { getProvider } from '@/lib/telematics/registry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATE_COOKIE = 'bouncie_oauth_state'
const STATE_TTL_SECONDS = 600

export async function GET(req: Request) {
  const siteUrl = getSiteUrl(req)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', siteUrl))
  }

  // Resolve tenant_id from profiles — matches the pattern used across the
  // dashboard (see lib/supabase/dashboard-auth.ts::requireTenantId).
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const tenantId = (profile as { tenant_id?: unknown } | null)?.tenant_id
  if (typeof tenantId !== 'string') {
    return NextResponse.redirect(new URL('/dashboard/settings', siteUrl))
  }

  // Feature-flag gate at API level (audit finding #3). Middleware does not
  // cover /api/telematics/*, so this is the authoritative check.
  const enabled = await isFeatureEnabled(tenantId, 'bouncie_telematics')
  if (!enabled) {
    return NextResponse.redirect(
      new URL('/dashboard/settings/billing?upgrade=telematics', siteUrl),
    )
  }

  const state = crypto.randomBytes(16).toString('hex')

  cookies().set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: STATE_TTL_SECONDS,
    path: '/',
  })

  const url = getProvider('bouncie').buildAuthorizationUrl(
    state,
    bouncieConfig.redirectUri,
  )
  return NextResponse.redirect(url)
}

function getSiteUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
}
