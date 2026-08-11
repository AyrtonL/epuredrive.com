import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function deleteConnectionForCurrentUser(): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const tenantId = profile?.tenant_id
  if (!tenantId) return

  const adminClient = createAdminClient()
  await adminClient.from('qb_connections').delete().eq('tenant_id', tenantId)
}

/**
 * GET /api/integrations/quickbooks/disconnect
 * Intuit's "Disconnect URL" — Intuit's platform navigates the browser here
 * (a plain cross-origin GET redirect) when a customer disconnects the app
 * from within QuickBooks. Intuit does not sign or authenticate this
 * redirect, so this endpoint can't verify the request actually originated
 * from Intuit — accept that as a known, bounded risk: worst case is a
 * logged-in user's own sync gets disabled (recoverable via Reconnect), no
 * cross-tenant access or data exposure is possible since tenant_id is always
 * derived from the session. The in-app "Disconnect" button uses the POST
 * handler below instead, which is protected against cross-site requests.
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  await deleteConnectionForCurrentUser()
  return NextResponse.redirect(`${origin}/dashboard/integrations/quickbooks?qb=disconnected`)
}

/**
 * POST /api/integrations/quickbooks/disconnect
 * Used by the in-app "Disconnect" button. Requires a same-origin request
 * (via the Fetch Metadata `Sec-Fetch-Site` header) so it can't be triggered
 * by a cross-site form or link.
 */
export async function POST(request: Request) {
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await deleteConnectionForCurrentUser()
  return NextResponse.json({ ok: true })
}
