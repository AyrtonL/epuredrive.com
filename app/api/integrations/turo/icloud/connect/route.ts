/**
 * POST /api/integrations/turo/icloud/connect
 * Validates iCloud IMAP credentials before saving, then upserts into turo_email_syncs.
 * Unlike the client-side action, this actually tests the connection first.
 * Requires: SUPABASE_SERVICE_ROLE_KEY
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  // Verify caller is authenticated and get their tenant_id
  const supabaseUser = createClient()
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabaseUser
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const tenantId: string = profile?.tenant_id
  if (!tenantId || !UUID_RE.test(tenantId)) {
    return NextResponse.json({ error: 'Could not resolve tenant' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, password } = body as Record<string, string>
  if (!email || !password) {
    return NextResponse.json({ error: 'email and password are required' }, { status: 400 })
  }

  // Validate iCloud IMAP credentials before saving
  try {
    const { ImapFlow } = await import('imapflow')
    const client = new ImapFlow({
      host: 'imap.mail.me.com',
      port: 993,
      secure: true,
      auth: { user: email, pass: password },
      logger: false,
    })
    await client.connect()
    await client.logout()
  } catch (err: unknown) {
    console.warn('[icloud-connect] IMAP auth failed:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: 'Invalid credentials. Check your iCloud email and app-specific password.' },
      { status: 400 }
    )
  }

  // Save to DB using service role (bypasses RLS)
  const supabaseAdmin = createAdminClient()
  const { error: upsertError } = await supabaseAdmin.from('turo_email_syncs').upsert(
    {
      tenant_id: tenantId,
      provider: 'icloud',
      gmail_address: email,
      app_specific_password: password,
      access_token: '',
      refresh_token: '',
      active: true,
      last_checked: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: 'tenant_id' }
  )

  if (upsertError) {
    console.error('[icloud-connect] Supabase upsert failed:', upsertError.message)
    return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, email })
}
