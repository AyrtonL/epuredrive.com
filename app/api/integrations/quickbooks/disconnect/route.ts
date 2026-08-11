import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/integrations/quickbooks/disconnect
 * Intuit's "Disconnect URL" — the browser lands here when a customer
 * disconnects the app from QuickBooks (or when the user disconnects from
 * within éPure Drive). Deletes the stored connection so encrypted tokens
 * aren't retained after access has been revoked.
 * tenant_id is always derived from the authenticated session, never trusted
 * from the request.
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const tenantId = profile?.tenant_id
  if (tenantId) {
    const adminClient = createAdminClient()
    await adminClient.from('qb_connections').delete().eq('tenant_id', tenantId)
  }

  return NextResponse.redirect(`${origin}/dashboard/integrations/quickbooks?qb=disconnected`)
}
